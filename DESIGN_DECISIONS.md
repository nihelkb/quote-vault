# Knowledge Vault - Decisiones de Diseño

> Documento de referencia para el rediseño de Quote Vault → Knowledge Vault
> Última actualización: 2026-01-20

---

## 1. Visión del Producto

### Problema que resuelve
Tener un lugar centralizado para organizar conocimientos que ayuden a formar ideologías fundamentadas, evitando depender de búsquedas superficiales en internet.

### Casos de uso principales
1. **Investigación estructurada**: Recopilar información sobre temas complejos (ej: conflicto palestino-israelí) con contexto histórico, argumentos, contraargumentos, fuentes y datos verificables.
2. **Captura rápida de insights**: Extraer y guardar ideas de videos de YouTube, podcasts o artículos para procesarlas posteriormente.
3. **Colección de citas**: Guardar frases memorables de personas o libros, independientemente de si pertenecen a un tema de investigación.

---

## 2. Arquitectura de la Información

### Tres pilares del sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                     KNOWLEDGE VAULT                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  📖 WIKI     │  │ 📝 INSIGHTS  │  │  💬 CITAS    │          │
│  │  (Formal)    │  │ (Informal)   │  │  (Híbrido)   │          │
│  │              │  │              │  │              │          │
│  │  Temas       │  │  Borradores  │  │  Frases      │          │
│  │  estructurados│ │  de videos   │  │  memorables  │          │
│  │  con plantilla│ │  y contenido │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         ▲                 │                  │                  │
│         │                 │                  │                  │
│         └─────────────────┴──────────────────┘                  │
│              (los insights y citas pueden                       │
│               vincularse a temas de la wiki)                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Relaciones entre entidades

| Desde | Hacia | Relación |
|-------|-------|----------|
| Insight | Tema | Puede promoverse/vincularse (opcional) |
| Cita | Tema | Puede vincularse (opcional) |
| Cita | Cita | Contraargumentos (jerárquico) |
| Tema | Tema | Conexiones bidireccionales |
| Entrada Wiki | Entrada Wiki | Refutaciones (argumento → contraargumento) |

---

## 3. Modelo de Datos

### 3.1 Topics (Temas de Wiki)

Evolución de la colección `collections` actual.

```javascript
{
  id: string,                    // Auto-generado
  userId: string,                // UID del usuario
  name: string,                  // "Conflicto Palestino-Israelí"
  description: string,           // Descripción del tema
  icon: string,                  // Emoji representativo (opcional)
  status: "in_progress" | "consolidated",

  // Secciones habilitadas (plantilla)
  sections: {
    timeline: boolean,           // Contexto histórico
    arguments: boolean,          // Argumentos favor/contra
    data: boolean,               // Datos y estadísticas
    sources: boolean,            // Fuentes y referencias
    quotes: boolean,             // Citas relacionadas
    connections: boolean         // Temas relacionados
  },

  // Metadata
  tags: string[],
  relatedTopicIds: string[],     // Conexiones con otros temas
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 3.2 Knowledge Entries (Entradas de Wiki)

Nueva colección para el contenido estructurado de cada tema.

```javascript
{
  id: string,
  userId: string,
  topicId: string,               // Tema al que pertenece

  // Tipo de entrada
  entryType: "timeline_event" | "argument" | "counterargument" | "fact" | "source",

  // Contenido
  title: string,                 // Para eventos de timeline
  content: string,               // Contenido principal
  date: string,                  // Para eventos (ej: "1948")
  author: string | null,         // Quién lo dice (para argumentos)

  // Fuente
  sourceUrl: string | null,
  sourceTitle: string | null,
  sourceType: "book" | "video" | "article" | "document" | "personal" | null,

  // Posición (para argumentos)
  stance: "favor" | "contra" | "neutral" | null,

  // Relaciones
  parentId: string | null,       // Para contraargumentos anidados
  refutesId: string | null,      // Qué argumento refuta

  // Verificación
  verified: boolean,             // ¿Información verificada?
  confidence: "high" | "medium" | "low",
  verificationNotes: string,     // Notas sobre verificación

  // Metadata
  tags: string[],
  notes: string,                 // Notas personales
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 3.3 Insights (Captura Rápida)

Nueva colección para borradores de contenido consumido.

```javascript
{
  id: string,
  userId: string,

  // Fuente
  sourceUrl: string,             // URL del video/artículo
  sourceTitle: string,           // Título detectado o manual
  sourceType: "youtube" | "article" | "podcast" | "book" | "other",
  sourceThumbnail: string | null, // Miniatura (para videos)
  sourceDuration: string | null,  // Duración (para videos)
  sourceChannel: string | null,   // Canal/autor

  // Contenido capturado
  rawNotes: string,              // Apuntes en bruto del usuario
  aiSummary: string | null,      // Resumen generado por IA
  keyPoints: string[],           // Puntos clave extraídos
  toVerify: string[],            // Datos a verificar después

  // Estado
  status: "draft" | "reviewed" | "integrated" | "discarded",

  // Vinculación con Wiki
  linkedTopicId: string | null,  // Tema vinculado (opcional)
  promotedEntryIds: string[],    // Entries creados desde este insight

  // Metadata
  tags: string[],
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 3.4 Quotes (Citas) - Evolución del modelo actual

Mantiene compatibilidad con el modelo existente, añadiendo vinculación a temas.

```javascript
{
  id: string,
  userId: string,

  // Contenido (existente)
  text: string,                  // La cita
  author: string,                // Autor
  source: string | null,         // Libro, discurso, etc.

  // Posición (existente)
  stance: "favor" | "contra" | "neutral",

  // Jerarquía (existente)
  parentId: string | null,       // Para contraargumentos

  // NUEVO: Vinculación a tema
  topicId: string | null,        // Tema relacionado (opcional)

  // Metadata (existente)
  tags: string[],
  notes: string,
  favorite: boolean,

  // Timestamps
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**Nota de migración**: El campo `collectionId` actual se mapea a `topicId`. Las colecciones existentes se migran a topics.

---

## 4. Vistas de la Aplicación

### 4.1 Dashboard (Vista Principal)

**Propósito**: Punto de entrada que muestra el estado general y accesos rápidos.

**Elementos**:
- Tres pestañas principales: Wiki, Insights, Citas
- Contador de elementos en cada sección
- Búsqueda global
- Grid de temas con:
  - Nombre e icono
  - Conteo de argumentos y fuentes
  - Barra de progreso (% completado)
  - Fecha de última actualización
- Lista de insights recientes sin procesar
- FAB para captura rápida

### 4.2 Vista de Tema (Wiki)

**Propósito**: Visualizar y editar el conocimiento estructurado de un tema.

**Secciones** (pestañas internas):
1. **Contexto Histórico**: Línea temporal de eventos
2. **Argumentos**: Vista comparativa favor vs. contra con contraargumentos
3. **Datos**: Estadísticas y hechos verificables
4. **Fuentes**: Referencias organizadas por tipo
5. **Citas**: Citas vinculadas al tema
6. **Conexiones**: Temas relacionados (grafo simple)

**Características**:
- Cada entrada muestra estado de verificación (✓ verificado, ⚠️ pendiente)
- Nivel de confianza visible
- Acciones: editar, eliminar, añadir contraargumento
- Botón para añadir nueva entrada en cada sección

### 4.3 Captura Rápida (Insights)

**Propósito**: Tomar apuntes rápidos de contenido consumido.

**Flujo**:
1. Pegar URL → detectar metadatos automáticamente
2. Escribir apuntes en texto libre mientras se consume el contenido
3. (Opcional) Usar IA para estructurar los apuntes
4. Revisar puntos clave generados
5. Marcar datos a verificar
6. Añadir tags
7. Guardar como borrador o promover directamente a Wiki

**Estados de un insight**:
- `draft`: Recién capturado, sin revisar
- `reviewed`: Revisado y organizado
- `integrated`: Contenido movido a la Wiki
- `discarded`: Descartado (no útil)

### 4.4 Lista de Insights

**Propósito**: Gestionar todos los insights capturados.

**Filtros**:
- Por estado (todos, borradores, revisados, integrados)
- Por tags
- Búsqueda por texto

**Acciones por insight**:
- Revisar/editar
- Promover a Wiki
- Descartar
- Ver en Wiki (si ya está integrado)

### 4.5 Vista de Citas

**Propósito**: Mantener la funcionalidad actual de gestión de citas.

**Características** (mantenidas):
- Lista de citas con autor y fuente
- Filtros: tema, posición, favoritas, ordenamiento
- Contraargumentos anidados
- Vista comparar (favor vs. contra)
- Favoritos

**Características nuevas**:
- Filtro por tema vinculado
- Acción "Vincular a tema"
- Indicador visual de tema vinculado
- Acceso rápido "Ver en Wiki" para citas vinculadas

---

## 5. Integración con IA

### Fase inicial (sin coste)

Estructuración de notas manuales del usuario:
- Input: texto libre con apuntes
- Output: puntos clave, datos a verificar, tags sugeridos

### Fase futura (con API)

1. **Extracción de transcripciones de YouTube** (API de YouTube)
2. **Resumen automático** de transcripciones largas
3. **Sugerencia de conexiones** entre temas
4. **Verificación de datos** contra fuentes confiables

### Consideraciones técnicas

- La IA es una ayuda, no reemplaza el análisis crítico del usuario
- Siempre mostrar que el contenido fue generado/estructurado por IA
- Permitir edición completa del output de IA antes de guardar
- Almacenar si un contenido fue asistido por IA (para referencia)

---

## 6. Navegación y UX

### Estructura de navegación

```
Dashboard
├── Wiki (lista de temas)
│   └── Tema individual
│       ├── Contexto
│       ├── Argumentos
│       ├── Datos
│       ├── Fuentes
│       ├── Citas
│       └── Conexiones
├── Insights (lista)
│   └── Captura/edición de insight
├── Citas (lista)
│   └── Nueva/editar cita
└── Búsqueda global
```

### Acciones rápidas (FAB)

- En Dashboard: Nueva captura rápida
- En Wiki: Nuevo tema
- En Tema: Nueva entrada (contextual a la sección activa)
- En Citas: Nueva cita

### Responsive

- Desktop: Layout completo con sidebar o tabs
- Mobile:
  - Navegación por tabs en bottom bar o hamburger menu
  - FAB flotante
  - Filtros colapsables
  - Cards adaptadas a ancho de pantalla

---

## 7. Migración de Datos

### Estrategia

1. **Collections → Topics**: Mapeo directo, añadir campos nuevos con defaults
2. **Quotes**: Añadir campo `topicId` (null por defecto), renombrar `collectionId` a `topicId`
3. **Nuevas colecciones**: Crear `knowledge_entries` e `insights` vacías

### Script de migración

```javascript
// Pseudocódigo
for each collection in collections:
  create topic with:
    - name: collection.name
    - description: ""
    - icon: "📁"
    - status: "in_progress"
    - sections: all enabled
    - tags: []
    - relatedTopicIds: []

for each quote in quotes:
  update quote with:
    - topicId: quote.collectionId || null
  remove:
    - collectionId
```

### Compatibilidad

- Mantener la app funcional durante la migración
- Permitir rollback si hay problemas
- No perder datos existentes

---

## 8. Fases de Implementación

### Fase 1: Fundamentos
- [ ] Actualizar modelo de datos (Firestore)
- [ ] Migrar collections → topics
- [ ] Añadir topicId a quotes
- [ ] Crear estructura base de nuevas colecciones

### Fase 2: Dashboard y navegación
- [ ] Rediseñar vista principal con tres pestañas
- [ ] Implementar navegación entre secciones
- [ ] Adaptar responsive

### Fase 3: Vista de Tema (Wiki)
- [ ] Crear componente TopicView
- [ ] Implementar secciones con pestañas
- [ ] CRUD de knowledge_entries
- [ ] Vista de argumentos comparativa
- [ ] Mostrar citas vinculadas

### Fase 4: Captura de Insights
- [ ] Crear vista de captura rápida
- [ ] Detección de metadatos de URL (YouTube)
- [ ] CRUD de insights
- [ ] Lista de insights con filtros
- [ ] Flujo de promoción a Wiki

### Fase 5: Integración IA
- [ ] Estructuración de notas con IA
- [ ] UI para mostrar/editar sugerencias
- [ ] Almacenar metadata de asistencia IA

### Fase 6: Mejoras
- [ ] Sistema de conexiones entre temas
- [ ] Búsqueda global mejorada
- [ ] Estadísticas y progreso
- [ ] Export de datos

---

## 9. Decisiones Técnicas

### Stack (mantener actual)
- **Frontend**: Vanilla JavaScript (ES6 modules)
- **Build**: Vite
- **Backend**: Firebase (Firestore + Auth)
- **Estilos**: CSS custom (sin framework)
- **i18n**: Sistema custom JSON

### Nuevas dependencias potenciales
- API de YouTube (oEmbed para metadatos básicos, gratis)
- API de OpenAI/Anthropic (para IA, fase futura, con coste)

### Patrones a seguir
- Mantener arquitectura de servicios actual (AuthService, QuoteService, etc.)
- Crear nuevos servicios: TopicService, InsightService, KnowledgeEntryService
- Reutilizar componentes existentes donde sea posible
- Mantener el patrón de suscripciones real-time de Firestore

---

## 10. Preguntas Abiertas

> Sección para documentar decisiones pendientes

1. **¿Implementar grafo visual de conexiones?** - Complejidad alta, valor incierto
2. **¿Permitir temas colaborativos?** - Fuera de scope inicial (uso personal)
3. **¿Offline support?** - Evaluar necesidad real
4. **¿Export a Markdown/PDF?** - Útil pero no prioritario

---

## Historial de Cambios

| Fecha | Cambio |
|-------|--------|
| 2026-01-20 | Documento inicial con decisiones de diseño |
