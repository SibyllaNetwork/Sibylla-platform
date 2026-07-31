FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN mkdir -p /app/data
ENV DATABASE_URL=sqlite:////app/data/outlet_manager.db
EXPOSE 8000
CMD ["python", "-m", "flask", "--app", "app.main", "run", "--host", "0.0.0.0", "--port", "8000"]
