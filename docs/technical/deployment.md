# Despliegue

La imagen contiene el build de Angular y el BFF, corre como usuario sin privilegios y funciona con el sistema de archivos en solo lectura. `ENVM` elige la configuración de Angular.

## Docker

```bash
cp secrets/local.env.example secrets/local.env   # credenciales, o VAULT_TOKEN con VAULT_ENABLED=true
# completa los valores vacíos de config/local.env, salvo los que traiga Vault
docker compose up -d --build
curl http://localhost:3000/health
```

En producción el BFF no arranca sin `BACKBONE_APPLICATION_ID`, `BACKBONE_CLIENT_ID` y `BACKBONE_CLIENT_SECRET` (código de salida 78).

El contenedor toma `config/local.env` y después `secrets/local.env`; `docker-compose.yml` fija `PORT`, `NODE_ENV`, `TRUST_PROXY` y las URL de Mercury y backbone-rest. Compose monta el certificado de la CA interna desde `../nginx/config/ssl` (otra carpeta con `BFF_TLS_DIR`) para validar Mercury y backbone-rest por HTTPS.

Para usar otro entorno de Angular: `ENVM=qa docker compose build`.

## Kubernetes

```bash
kubectl create secret generic iris-secrets --from-env-file=secrets/local.env
kubectl apply -f k8s/iris.yaml
```

`k8s/iris.yaml` define el ConfigMap (el equivalente de `config/local.env`), un Deployment de dos réplicas con sondas de `/health` y un Service. Ajusta `MERCURY_BASE_URL` y `BACKBONE_BASE_URL` a tus servicios. Si el tráfico pasa por nginx, usa los prefijos `/mercury/api/v1` y `/backbone/api/v1`.
