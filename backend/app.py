from flask import Flask, jsonify
from mysql.connector import Error

from db import get_db_connection

app = Flask(__name__)


@app.get("/")
def home():
    return jsonify({
        "message": "LabourConnect backend is running",
        "stage": 1,
    })


@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "service": "LabourConnect API"})


@app.get("/api/db-health")
def database_health():
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute("SELECT DATABASE(), VERSION()")
        database_name, mysql_version = cursor.fetchone()

        return jsonify({
            "status": "connected",
            "database": database_name,
            "mysql_version": mysql_version,
        })
    except (Error, RuntimeError):
        app.logger.exception("Database health check failed")
        return jsonify({
            "status": "error",
            "message": "Could not connect to the database. Check local configuration.",
        }), 503
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None and connection.is_connected():
            connection.close()


if __name__ == "__main__":
    # Local development only. Do not use Flask's debug server in production.
    app.run(host="127.0.0.1", port=5000, debug=True)
