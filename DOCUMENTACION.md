
### Estándares de la Base de Datos

#### Identificadores (ID)

- **Tipo de Datos**: `SERIAL`
  - **Descripción**: Utilizado para generar automáticamente valores únicos y secuenciales para cada nuevo registro.
- **Nomenclatura**: `nombre_tabla_id` (ejemplo: `customer_id`)
  - **Descripción**: El identificador debe seguir una convención clara, usando el prefijo `id` seguido del nombre de la tabla en singular y en minúsculas, separando palabras con guiones bajos (`snake_case`).

#### Claves Primarias (PK)

- **Definición**: `PRIMARY KEY` en la columna de identificador
  - **Descripción**: Asegura que cada registro en la tabla tenga un valor único y no nulo para esa columna.
- **Nomenclatura**: `nombre_tabla_id` (ejemplo: `customer_id`)
  - **Descripción**: La clave primaria debe seguir la misma convención de nomenclatura que los identificadores.

#### Nomenclatura General

- **Tablas**: singular, `snake_case` (ejemplo: `customer`)
  - **Descripción**: Los nombres de las tablas deben ser en singular y en minúsculas, utilizando `snake_case` para separar palabras, manteniendo coherencia y facilitando la lectura del esquema de la base de datos.
- **Columnas**: descriptivos, `snake_case` (ejemplo: `first_name`)
  - **Descripción**: Los nombres de las columnas deben ser descriptivos, en minúsculas y usar `snake_case`, mejorando la legibilidad y comprensión del contenido de cada columna.
- **Claves Foráneas**: `nombre_tabla_relacionada_id` (ejemplo: `customer_id`)
  - **Descripción**: Las claves foráneas deben indicar claramente la tabla y columna a la que hacen referencia, usando el nombre de la tabla relacionada seguido de `_id`.
- **Índices**: `idx_nombre_columna` (ejemplo: `idx_customer_id`)
  - **Descripción**: Los nombres de los índices deben comenzar con el prefijo `idx_` seguido del nombre de la columna o columnas indexadas, facilitando la identificación de los índices en el esquema de la base de datos.
- **Restricciones**: `chk_`, `fk_`, `uq_` (ejemplo: `fk_order_customer_id`)
  - **Descripción**: Las restricciones deben seguir convenciones específicas según su tipo:
    - **CHECK**: Usar el prefijo `chk_` seguido de una descripción de la restricción.
    - **FOREIGN KEY**: Usar el prefijo `fk_` seguido del nombre de la tabla y columna referenciadas.
    - **UNIQUE**: Usar el prefijo `uq_` seguido del nombre de la columna.