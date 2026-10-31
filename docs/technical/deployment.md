# Despliegue

La imagen contiene el build de Angular y el BFF, corre como usuario sin privilegios y funciona con el sistema de archivos en solo lectura. `ENVM` elige la configuración de Angular.

## Docker

```bash
cp default.env.example .env.docker   # completa los valores; los secretos salen del gestor de secretos
docker compose up -d --build
curl http://localhost:3000/health
```

En producción el BFF no arranca sin `BACKBONE_APPLICATION_ID`, `BACKBONE_CLIENT_ID` y `BACKBONE_CLIENT_SECRET` (código de salida 78).

Para usar otro entorno de Angular: `ENVM=qa docker compose build`.

## Kubernetes

```bash
kubectl create secret generic iris-secrets --from-env-file=.env.secrets
kubectl apply -f k8s/iris.yaml
```

`k8s/iris.yaml` define el ConfigMap, un Deployment de dos réplicas con sondas de `/health` y un Service. Ajusta `MERCURY_BASE_URL` y `BACKBONE_BASE_URL` a tus servicios. Si el tráfico pasa por nginx, usa los prefijos `/mercury/api/v1` y `/backbone/api/v1`.
