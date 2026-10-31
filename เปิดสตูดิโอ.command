#!/bin/bash
set -e
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
cd -- "$(dirname -- "$0")"
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo 'กรุณาติดตั้ง Node.js 22.22 ขึ้นไป แล้วเปิดไฟล์นี้อีกครั้ง'
  read -r -p 'กด Enter เพื่อปิด…' reply
  exit 1
fi
if [ ! -d node_modules ]; then
  npm ci
fi
echo 'NangLung Studio — หยุดการทำงานด้วย Control+C'
npm run dev -- --open
