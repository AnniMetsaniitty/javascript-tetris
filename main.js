const path = require("path");
const fs = require("fs");
const { app, BrowserWindow, nativeImage } = require("electron");

app.commandLine.appendSwitch("no-sandbox");

function createWindow() {
  const iconPath = path.join(__dirname, "assets", "icon-image2.png");

  console.log("Icon exists:", fs.existsSync(iconPath));

  const icon = nativeImage.createFromPath(iconPath);

  console.log("Icon empty:", icon.isEmpty());

  const win = new BrowserWindow({
    width: 1000,
    height: 1130,
    icon: icon,
    title: "Compton Line Legacy",
  });

  win.loadFile("index.html");
}

app.whenReady().then(createWindow);