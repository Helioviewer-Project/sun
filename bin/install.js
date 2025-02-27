#!/usr/bin/env node

const fs = require("fs");

function usage() {
  console.log("Usage:");
  console.log("  npx hvsun-install <directory>");
  console.log("");
  console.log(
    "This script installs the sun models into the specified directory.",
  );
  console.log(
    "defaults to /resources/models"
  );
}

const pathToModels = require("path").resolve(__dirname, "../models");
function install(file, dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {recursive: true});
  }
  fs.copyFileSync(`${pathToModels}/${file}`, `${dir}/${file}`);
}

let target = process.argv[2] ?? "resources/models";
install("zit.glb", target);
