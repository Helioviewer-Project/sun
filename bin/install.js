#!/usr/bin/env node

const fs = require("fs");

function usage() {
  console.log("Usage:");
  console.log("  npx hvsun-install <directory>");
  console.log("");
  console.log(
    "This script installs the sun models into the specified directory",
  );
}

const pathToModels = require("path").resolve(__dirname, "../models");
function install(file, dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {recursive: true});
  }
  fs.copyFileSync(`${pathToModels}/${file}`, `${dir}/${file}`);
}

if (process.argv.length < 3) {
  console.error("Missing directory parameter.");
  usage();
}

let target = process.argv[2];
install("sun_model.gltf", target);
install("sun_model.bin", target);
