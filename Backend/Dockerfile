FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONUNBUFFERED=1

# Default port for the app
EXPOSE 5000

# Command to run the app
CMD gunicorn --worker-class eventlet -w 1 app:app -b 0.0.0.0:$PORT 