# 更換 rustdesk-console 二進位（香港繁體中文）

這是 dockers-x/rustdesk-console **v0.2.40** 的私人修補版，不是 RustDesk Pro，也不是 dockers-x 官方發佈。只加入兩項改動：管理對話框不被視窗上緣裁切，以及繁體中文（香港）管理介面。

目標主機：Proxmox LXC 111  
安裝目錄：`/opt/rustdesk-console/`  
systemd 單元：`rustdesk-console.service`  
服務帳號：`rustdesk-console`  
管理介面：`http://<LAN_IP>:21114/`（`<LAN_IP>` 為主機的區域網路位址）

不要覆寫這些檔案：

- `/opt/rustdesk-console/conf/config.yaml`
- JWT 或任何密鑰檔
- 資料庫與 `data/`
- `/opt/rustdesk-console/conf/id_ed25519.pub`

不要停止、重啟或更改 hbbs/hbbr（`rustdesksignal` / `rustdeskrelay`）或 gohttpserver。

把 `dist/rustdesk-console-0.2.40-zh-HK-x86_64-unknown-linux-musl.tar.gz` 傳到主機 `/tmp` 後，在 LXC 111 執行。二進位 `rustdesk-console` 的 sha256：

```
fa08ef341d40a42beab6d1702acf2d5cff60e18acbf692ef3e1504f527f9c50c  rustdesk-console
```

壓縮檔內的 `rustdesk-console.sha256` 用同一組校驗值。

```bash
set -euo pipefail
WORKDIR=/tmp/rustdesk-console-zh-HK
sudo install -d -m 755 "$WORKDIR"
sudo tar -C "$WORKDIR" -xzf /tmp/rustdesk-console-0.2.40-zh-HK-x86_64-unknown-linux-musl.tar.gz
cd "$WORKDIR"
sha256sum -c rustdesk-console.sha256

# 只確認管理服務，不要動 hbbs/hbbr。
systemctl is-active rustdesk-console.service
ss -lnt | awk 'NR==1 || /:21114|:80|:443/'

STAMP=$(date +%Y%m%d%H%M%S)
sudo install -d -o rustdesk-console -g rustdesk-console -m 755 /opt/rustdesk-console/backup
sudo cp -a /opt/rustdesk-console/rustdesk-console \
  "/opt/rustdesk-console/backup/rustdesk-console.${STAMP}"

sudo systemctl stop rustdesk-console.service
sudo install -o rustdesk-console -g rustdesk-console -m 755 \
  "$WORKDIR/rustdesk-console" \
  /opt/rustdesk-console/rustdesk-console
sudo systemctl start rustdesk-console.service

systemctl is-active rustdesk-console.service
curl -fsS -o /dev/null -w 'health %{http_code}\n' http://<LAN_IP>:21114/health
ss -lnt | awk 'NR==1 || /:21114|:80|:443/'
```

完成後應看到：

- `rustdesk-console.service` 為 `active`
- `http://<LAN_IP>:21114/health` 回傳 200
- `21114` 仍只綁在 `<LAN_IP>`
- `80` 和 `443` 仍然沒有在聽
- hbbs、hbbr、gohttpserver 沒有被重啟

瀏覽器語言是 `zh-HK`、`zh-TW` 或 `zh-Hant` 時，管理介面會用繁體中文。右上角也可以手動選擇 English、簡體中文、繁體中文。

若要還原，停止服務後把 `backup/rustdesk-console.<時間>` 拷回 `/opt/rustdesk-console/rustdesk-console`，再啟動 `rustdesk-console.service`。同樣不要動設定、資料庫和 hbbs/hbbr。
