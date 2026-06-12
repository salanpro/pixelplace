from PIL import Image
import eventlet
eventlet.monkey_patch()
from flask import Flask, render_template
from flask_socketio import SocketIO, emit
import copy
import json
import os
from datetime import datetime

app = Flask(__name__)
socketio = SocketIO(app)

CANVAS_FILE = "canvas_save.json"
MAX_HISTORY = 30

def load_canvas():
    if os.path.exists(CANVAS_FILE):
        with open(CANVAS_FILE, "r") as f:
            print("Canvas cargado desde archivo.")
            return json.load(f)
    return [['#FFFFFF' for _ in range(64)] for _ in range(64)]

CANVAS_PNG = "canvas_save.png"

def save_canvas():
    with open(CANVAS_FILE, "w") as f:
        json.dump(pixels, f)
    
    img = Image.new("RGB", (64, 64))
    for y in range(64):
        for x in range(64):
            hex_color = pixels[y][x].lstrip("#")
            r, g, b = tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
            img.putpixel((x, y), (r, g, b))
    img.save(CANVAS_PNG)
    
    print(f"Canvas guardado: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
pixels = load_canvas()
history = []

def auto_save_loop():
    while True:
        eventlet.sleep(86400)  
        save_canvas()

eventlet.spawn(auto_save_loop)

@app.route("/")
def index():
    return render_template("index.html")

@socketio.on("start_stroke")
def handle_start_stroke():
    global pixels
    history.append(copy.deepcopy(pixels))
    if len(history) > MAX_HISTORY:
        history.pop(0)

@socketio.on("draw_pixel")
def handle_draw(data):
    global pixels
    x, y, color = data["x"], data["y"], data["color"]
    pixels[y][x] = color
    emit("update_pixel", data, broadcast=True)

@socketio.on("get_canvas")
def handle_get_canvas():
    emit("load_canvas", pixels)

@socketio.on("clear_canvas")
def handle_clear_canvas():
    global pixels
    history.append(copy.deepcopy(pixels))
    if len(history) > MAX_HISTORY:
        history.pop(0)
    pixels = [['#FFFFFF' for _ in range(64)] for _ in range(64)]
    emit("load_canvas", pixels, broadcast=True)

background_color = '#FFFFFF'

@socketio.on("change_bgcolor")
def handle_change_bgcolor(data):
    global background_color, pixels
    history.append(copy.deepcopy(pixels))
    if len(history) > MAX_HISTORY:
        history.pop(0)
    background_color = data["color"]
    pixels = [[background_color for _ in range(64)] for _ in range(64)]
    emit("load_canvas", pixels, broadcast=True)

@socketio.on("undo")
def handle_undo():
    global pixels
    if history:
        pixels = history.pop()
        emit("load_canvas", pixels, broadcast=True)

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000)
