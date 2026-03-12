# Elegoo Connect - Docker Setup

Remote access, AI failure detection, real-time notifications, and mobile apps for Elegoo Centauri / Centauri Carbon 3D printers via [OctoEverywhere](https://octoeverywhere.com).

## Prerequisites

- Docker and Docker Compose installed ([Linux](https://docs.docker.com/engine/install/) | [Mac](https://docs.docker.com/desktop/install/mac-install/) | [Windows](https://docs.docker.com/desktop/install/windows-install/))

## Setup

1. **Find your printer's IP address:**
   - Tap the gear icon on the printer's display
   - Tap the "Network" tab
   - The IP address is listed under your connected network (e.g. `192.168.1.50`)

2. **Edit `docker-compose.yml`** and replace `XXX.XXX.XXX.XXX` with your printer's IP address.

3. **Start the container:**
   ```bash
   docker compose up -d
   ```

4. **Check the logs for the linking URL:**
   ```bash
   docker compose logs
   ```
   Copy the URL from the logs to link your printer to your OctoEverywhere account.

## Updating

```bash
docker compose pull
docker compose up -d
```

## Multiple Printers

Duplicate the service block in `docker-compose.yml` with a unique name and IP for each printer. Example:

```yaml
services:
  elegoo-connect-printer-1:
    image: octoeverywhere/octoeverywhere:latest
    environment:
      - COMPANION_MODE=elegoo
      - PRINTER_IP=192.168.1.50
    volumes:
      - ./data-printer-1:/data

  elegoo-connect-printer-2:
    image: octoeverywhere/octoeverywhere:latest
    environment:
      - COMPANION_MODE=elegoo
      - PRINTER_IP=192.168.1.51
    volumes:
      - ./data-printer-2:/data
```
