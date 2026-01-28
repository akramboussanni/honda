# Honda 

App for managing WOL and/or uptime & status of home machines. There is a [ESP32 app](https://github.com/abous/hondakey) that can be used to send WOL packets to the machines through the app.

![Admin Dashboard](assets/admin.png)
![Home Dashboard](assets/home.png)


## Environment Variables

You can copy the `.env.example` file to `.env` and edit it to your liking.

## Deployment

### Using Docker Compose (Recommended)

1. Grab the `docker-compose.yml` file
2. Edit env vars to your liking
3. Run `docker-compose up -d`

The application will be available at `http://localhost:8000`

Note, the app has to run in host mode for network discovery + sending WOL magic packets to work.

### Manual Deployment

```bash
# Install dependencies
pip install -r requirements.txt

# Run the application
uvicorn main:app --host 0.0.0.0 --port 8000
```