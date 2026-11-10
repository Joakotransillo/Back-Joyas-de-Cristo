# Back-Joyas-de-Cristo
API REST para la plataforma web del Club de Conquistadores. Arquitectura en capas con Express y MySQL.

## Configuración local en Windows

1. Instalá MySQL Server 8.0.13 o posterior y MySQL Workbench. El instalador oficial para Windows puede instalar ambos productos.
2. En Workbench, conectate al servidor local y ejecutá:

   ```sql
   CREATE DATABASE joyas_de_cristo_db
     CHARACTER SET utf8mb4
     COLLATE utf8mb4_unicode_ci;
   ```

3. Copiá `.env.example` como `.env` y completá las credenciales de MySQL. Configurá `JWT_SECRET` con un secreto aleatorio de al menos 32 bytes.
4. En Workbench, abrí y ejecutá `database/init.sql` con `joyas_de_cristo_db` seleccionada como esquema predeterminado. Después abrí y ejecutá `database/seed.sql`.
5. Instalá las dependencias con `npm ci` y arrancá la API con `npm run dev`.

`database/init.sql` elimina y recrea las tablas del esquema seleccionado. No lo ejecutes sobre una base con datos que quieras conservar. Estos archivos preparan MySQL desde cero; no copian registros desde una base PostgreSQL existente.
