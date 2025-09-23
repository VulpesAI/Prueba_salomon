# Certificado SSL autofirmado para desarrollo/staging
# Este archivo se generará automáticamente en producción
# Para generar un certificado autofirmado:
# openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout salomon.key -out salomon.crt