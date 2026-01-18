# Quote Vault - Repositorio Personal de Citas

Una aplicación minimalista para guardar y organizar tus citas favoritas con persistencia en Firebase.

## Configuración

### 1. Crear proyecto en Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Clic en "Crear proyecto" (o "Add project")
3. Nombra tu proyecto (ej: "quote-vault")
4. Desactiva Google Analytics si no lo necesitas
5. Clic en "Crear proyecto"

### 2. Habilitar Authentication

1. En el panel izquierdo, clic en **Authentication**
2. Clic en **Comenzar** (Get started)
3. En la pestaña "Sign-in method", habilita **Correo electrónico/contraseña**
4. Guarda los cambios

### 3. Crear base de datos Firestore

1. En el panel izquierdo, clic en **Firestore Database**
2. Clic en **Crear base de datos**
3. Selecciona "Comenzar en modo de producción"
4. Elige la ubicación más cercana (ej: `eur3` para Europa)
5. Clic en **Habilitar**

### 4. Configurar reglas de seguridad

En Firestore > Reglas, reemplaza el contenido con:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /quotes/{quoteId} {
      // Solo el propietario puede leer/escribir sus citas
      allow read, write: if request.auth != null 
                         && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null 
                    && request.auth.uid == request.resource.data.userId;
    }
  }
}
```

Clic en **Publicar**.

### 5. Crear índice en Firestore

Para que las consultas funcionen, necesitas crear un índice:

1. Ve a Firestore > **Índices**
2. Clic en **Crear índice**
3. Configura:
   - Colección: `quotes`
   - Campo 1: `userId` - Ascendente
   - Campo 2: `createdAt` - Descendente
4. Clic en **Crear**

Espera unos minutos a que se complete.

### 6. Obtener credenciales

1. En la página principal del proyecto, clic en el icono **</>** (Web)
2. Registra tu app con un nombre (ej: "quote-vault-web")
3. NO marques Firebase Hosting
4. Copia los valores de `firebaseConfig`

### 7. Configurar la aplicación

Abre `index.html` y busca esta sección (alrededor de la línea 380):

```javascript
const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "TU_PROYECTO.firebaseapp.com",
    projectId: "TU_PROYECTO",
    storageBucket: "TU_PROYECTO.appspot.com",
    messagingSenderId: "TU_SENDER_ID",
    appId: "TU_APP_ID"
};
```

Reemplaza con tus credenciales de Firebase.

## Despliegue en Netlify

### Opción A: Arrastrar y soltar

1. Ve a [Netlify](https://app.netlify.com/)
2. Arrastra la carpeta `quote-vault` a la zona de deploy
3. ¡Listo! Netlify te dará una URL

### Opción B: Conectar repositorio Git

1. Sube la carpeta a GitHub/GitLab
2. En Netlify, clic en "New site from Git"
3. Conecta tu repositorio
4. Deploy settings:
   - Build command: (dejar vacío)
   - Publish directory: `/`
5. Clic en "Deploy site"

### Configurar dominio personalizado (opcional)

1. En Netlify > Site settings > Domain management
2. Añade tu dominio personalizado
3. Sigue las instrucciones para configurar DNS

## Estructura de datos

Cada cita se guarda en Firestore con esta estructura:

```json
{
  "text": "La cita...",
  "author": "Autor",
  "source": "Libro o fuente",
  "type": "libro|persona|articulo|pelicula|podcast|otro",
  "stance": "favor|contra|neutral",
  "tags": ["filosofía", "ética"],
  "notes": "Mis reflexiones...",
  "userId": "uid-del-usuario",
  "createdAt": "2025-01-18T...",
  "updatedAt": "2025-01-18T..."
}
```

## Características

- ✅ Autenticación por email/contraseña
- ✅ Datos sincronizados en tiempo real
- ✅ Clasificación por tipo y postura
- ✅ Etiquetas personalizadas
- ✅ Notas y reflexiones
- ✅ Búsqueda y filtros
- ✅ Diseño responsive y minimalista
- ✅ Cada usuario ve solo sus citas

## Seguridad

- Las credenciales de Firebase son públicas por diseño (están protegidas por las reglas de Firestore)
- Las reglas de seguridad aseguran que cada usuario solo accede a sus propios datos
- Las contraseñas nunca se almacenan en tu código (Firebase las maneja)
