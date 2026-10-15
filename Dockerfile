FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV HOST=0.0.0.0
EXPOSE 8000
RUN useradd --system --no-create-home rig
USER rig
CMD ["python", "app.py"]
