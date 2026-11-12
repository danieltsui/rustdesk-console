# 自有簽名客戶端

[English](self-signed-client.en.md) · [简体中文](self-signed-client.zh-CN.md)

本功能為你自己的 RustDesk 源碼組建準備簽名設定和品牌資源，不提供客戶端在線組建，也不修改官方客戶端。官方發佈的二進制仍信任其內置公鑰，不能驗證你的簽名。

源碼核對基線：客戶端 `bd9262397208c509ea97af61f0d44621ef25611c`，其 `hbb_common` 為 `5d52530b636fb296a324260b074780cf559e0093`。升級客戶端後，應重新核對下列協議和路徑。

## 1. 啟用功能

自有簽名客戶端預設關閉。在系統設定的功能模組區啟用「自有簽名客戶端」，才會顯示專屬選單及密鑰、簽名、品牌、預設選項和文件入口。關閉後，這些入口隱藏，後端拒絕相關操作。

關閉功能不會撤銷已下載的 `custom.txt`，也不會讓已組建客戶端忘記它的驗證公鑰。需要撤銷舊設定時，應重新分發設定或更新客戶端信任的公鑰。

## 2. 準備獨立的簽名密鑰

這裡使用 Ed25519，不是 PEM、RSA 或 ECDSA。你可以在頁面一鍵產生，也可以匯入已有密鑰。

### 在頁面一鍵產生

1. 用管理員帳號進入系統設定，啟用「自有簽名客戶端」。
2. 開啟專屬選單，選擇「密鑰與簽名」，點選「一鍵產生密鑰對」。首次產生直接執行；已有密鑰時，先備份原密鑰檔案，再確認取代。
3. 成功後，伺服器已自動儲存新密鑰對，頁面顯示驗籤公鑰和指紋。只有本次產生回應會同時返回新私鑰，並帶有 `Cache-Control: no-store`；頁面隨即發起 `self-signed-client-keypair.json` 下載，不把私鑰保留在 query 或 mutation 緩存中。
4. 複製「驗籤公鑰（標準 base64）」中的完整內容，保留末尾的 `=`，用於第 4 節的客戶端源碼取代。不要誤用 hbbs 公鑰。

下載的 JSON 包含 `algorithm`、`public_key`、`private_key` 和 `fingerprint`。它是**未加密的私鑰備份**，不是客戶端設定或組建資源。請使用 HTTPS 和可信的管理員瀏覽器，確認下載完成後，將檔案從共享下載目錄或同步目錄移到加密離線儲存，並限制本地檔案存取權限，例如在 Unix 上執行 `chmod 600`。不能把它隨客戶端分發或上載到公開倉庫。

後續讀取設定和匯入密鑰都不回顯私鑰，也沒有下載已有伺服器端密鑰的介面：每次點選「一鍵產生密鑰對」都會取代為新密鑰。下載被阻止或檔案丟失時，應按下文從伺服器備份當前密鑰，不要為了重新下載而產生新密鑰。恢復下載的密鑰對時，先啟用功能，再匯入 JSON 中的 `private_key` 值及可選的相符 `public_key`，不要將整個 JSON 貼上到私鑰輸入框。此備份不包含已儲存的預設設定和功能開關。

不需要先在外部產生密鑰才能啟用功能。若選擇匯入，填寫私鑰及可選的相符公鑰；開啟功能後才能匯入或清除密鑰。關閉時只保留功能開關，不能設定密鑰或簽名。

| 材料 | 原始位元組長度 | 說明 |
| --- | --- | --- |
| Ed25519 seed | 32 | 可用於確定性派生密鑰對，必須保密。 |
| libsodium secret key | 64 | 格式為 `seed || public_key`，不是任意 64 位元組，也不是 32 位元組 seed。 |
| public key | 32 | 用於客戶端驗籤，可以分發。 |
| signature | 64 | 對原始 JSON 位元組的 Ed25519 簽名。 |

上述位元組使用標準 Base64 表示，保留必要的 `=` 填充。匯入 64 位元組密鑰時，派生公鑰必須與後 32 位元組一致。不要將 OpenSSH、PKCS#8 或 PEM 文字直接當作這種 Base64。

客戶端設定簽名密鑰應獨立於 hbbs/hbbr 的伺服器密鑰、Console 的 JWT 密鑰以及 Windows/macOS 套用簽名證書。私鑰只保留在受控的 Console 設定和離線備份中，不進入客戶端源碼、組建包、日誌或公開倉庫。

### 儲存位置、備份與恢復

密鑰不寫入普通 `config.yaml`。獨立檔案的精確路徑是 `<配置文件所在目录>/features/self-signed-client.json`，其中同時儲存功能開關、公鑰、私鑰和已儲存的預設設定；Unix 上目錄必須為 `0700`、檔案必須為 `0600`。啟動參數 `-c` / `--config` 決定設定檔路徑，相對路徑以 Console 進程的工作目錄為準。

- 預設 `-c ./conf/config.yaml` 對應 `./conf/features/self-signed-client.json`。
- 本倉庫 Docker Compose 將主機 `./conf` 掛載到容器 `/app/conf`，因此容器檔案 `/app/conf/features/self-signed-client.json` 對應主機 `./conf/features/self-signed-client.json`。
- 自訂啟動參數或容器掛載時，按實際設定路徑定位。必須持久化這個目錄，不能把密鑰放進 `resources`、上載目錄、客戶端發佈包或其他 Web 可存取位置。

一次性瀏覽器下載不能替代完整的伺服器端備份。備份時先停止 Console，使用服務帳號或有相應權限的伺服器管理員複製整個 feature 檔案到加密離線備份位置，不要通過瀏覽器介面提供該檔案或把內容列印到日誌。以下為 Unix 範例；請把備份路徑取代為你的私有備份目錄：

```sh
umask 077
install -d -m 700 /safe/offline-backup/rustdesk-console
install -m 600 ./conf/features/self-signed-client.json /safe/offline-backup/rustdesk-console/self-signed-client.json
```

恢復前同樣先停止 Console，並備份當前檔案。把原檔案恢復到新實例實際設定目錄的 `features/self-signed-client.json`，保留運行 Console 的服務帳號所有權，恢復目錄 `0700` 和檔案 `0600` 後再啟動。預設路徑的複製範例：

```sh
install -d -m 700 ./conf/features
install -m 600 /safe/offline-backup/rustdesk-console/self-signed-client.json ./conf/features/self-signed-client.json
```

檔案中的開關狀態也會恢復。啟動後檢查公鑰和指紋是否與備份前一致，再測試簽名。程式會拒絕寬鬆權限、符號連結或錯誤檔案類型，不能用放寬權限來處理讀取失敗。此檔案包含簽名私鑰，備份也必須按私鑰保護。

公鑰、指紋和 `custom.txt` 都不能恢復丟失的私鑰。沒有備份時只能產生新密鑰；要讓客戶端接受新密鑰產生的設定，必須更新 fork 中的驗籤公鑰並重新組建、分發客戶端。不要將「一鍵產生」當作找回舊密鑰。

## 3. 簽名設定的準確格式

`src/common.rs::read_custom_client` 的讀取順序是：

1. 對 `custom.txt` 做標準 Base64 解碼。
2. 用該函數內部的 `const KEY` 驗證 Ed25519 attached signature。
3. 從驗籤返回的訊息位元組中讀取 JSON 對象。

檔案內容為 `Base64(signature || UTF-8 JSON)`。它不是明文 JSON、分離的 `.sig` 檔案、JWT 或加密設定。簽名後不能修改 JSON 的空格、換行或欄位順序；外層 Base64 文字首尾的空白會被讀取器去掉。

簽名設定可被任何拿到檔案的人解碼。不要在其中存放 API token、私鑰或不應公開的密碼。

設定範例中的伺服器地址和公鑰需要取代為你自己的值：

```json
{
  "app-name": "AcmeDesk",
  "default-settings": {
    "custom-rendezvous-server": "id.example.com:21116",
    "relay-server": "relay.example.com:21117",
    "api-server": "https://console.example.com",
    "key": "YOUR_HBBS_PUBLIC_KEY_BASE64",
    "theme": "dark",
    "enable-webrtc": "Y"
  },
  "override-settings": {
    "enable-file-transfer": "N",
    "hide-server-settings": "Y",
    "display-name": "Acme Support"
  },
  "disable-settings": "N"
}
```

所有選項值都是字串。不要將 `"Y"` 寫成 `true`，或把端口、超時等字串寫成 JSON 數字。未知欄位即使能通過讀取器，也不代表有功能會消費它。

### 預設、覆寫與內置選項

`libs/base/src/config/keys.rs` 是當前客戶端選項分類的依據：

| 分類 | 對應清單 | 範例與邊界 |
| --- | --- | --- |
| 工作階段顯示 | `KEYS_DISPLAY_SETTINGS` | `view-only`、`view-style`、`image-quality`、`show-remote-cursor`。 |
| 本地客戶端 | `KEYS_LOCAL_SETTINGS` | `theme`、`lang`、`enable-webrtc`、`enable-tcp-punch`、`enable-udp-punch`、`enable-ipv6-punch`、`relay-fallback-delay`。 |
| 被控端和網絡 | `KEYS_SETTINGS` | `enable-file-transfer`、`approve-mode`、`custom-rendezvous-server`、`api-server`、`key`、`ice-servers`。 |
| 內置行為 | `KEYS_BUILDIN_SETTINGS` | `display-name`、`avatar`、`hide-server-settings`、`hide-powered-by-me`、`preset-user-name`、`preset-device-group-name`、`preset-strategy-name`。源碼中的 `BUILDIN` 是現有拼寫。 |

顯示、本地和被控端選項各有獨立的預設及覆寫表。設定讀取優先級為覆寫值高於用戶儲存值，用戶儲存值高於預設值。覆寫選項可被當前客戶端識別為固定值，但這不是不可繞過的安全隔離。

內置選項寫入同一張 `BUILTIN_SETTINGS` 表，不存在獨立的預設表與覆寫表。若兩組都給同一個內置選項賦值，後讀取的 `override-settings` 值覆寫前者。

`display-name` 和 `avatar` 用於連線請求中的身分展示，不是首頁 logo。`preset-address-book-*`、`preset-device-name`、`preset-device-username`、`preset-note` 屬於被控端設定；`preset-user-name`、`preset-device-group-name`、`preset-strategy-name` 屬於內置設定。預設歸類依賴裝置向 Console 上報系統資訊以及目標用戶、組、策略確實存在，不是單憑簽名就在伺服器端獲得權限。

`enable-webrtc`、打洞選項和 `relay-fallback-delay` 在簽名設定中可以進入 `LocalConfig` 對應的預設或覆寫表。Console heartbeat 策略只寫 `Config`，不能借此把這些本地選項當作動態策略下發。已有本地儲存值也可能覆寫 `default-settings` 的預設值。

### 頂層硬設定

`app-name` 單獨處理，會改變運行時應用程式名稱和 `get_uri_prefix()` 產生的 URI scheme。它不會自動取代安裝套件名稱、系統圖示、套用標識、快捷方式或代碼簽名。

其餘頂層字串進入 `HARD_SETTINGS`。當前源碼確認的消費項如下：

| 鍵 | 可用值及作用 |
| --- | --- |
| `conn-type` | `incoming` 僅接收連線；`outgoing` 僅發起連線。省略時不限制為其中一類。 |
| `disable-tcp-listen` | 嚴格為 `Y` 時停用相應 TCP 監聽路徑，不等同於停用全部網絡傳輸。 |
| `disable-settings` | 嚴格為 `Y` 時停用設定入口。 |
| `disable-ab` | 嚴格為 `Y` 時停用通訊錄。 |
| `disable-account` | 嚴格為 `Y` 時停用帳號功能。 |
| `disable-installation` | 嚴格為 `Y` 時停用客戶端的安裝路徑。 |

這五個開關用 `N` 或省略表示不啟用。源碼還讀取 `password` 和 `salt`，但它們是預設永久密碼的專用儲存材料，不是普通明文密碼欄位，本功能不提供其產生或通用編輯。不要將 `logo`、`appicon` 或其他沒有消費代碼的鍵當作可用硬設定。

## 4. 在你自己的 fork 中設定信任

1. 完成第 2 節的密鑰產生與備份，複製頁面顯示的完整驗籤公鑰。
2. 克隆你自己的客戶端 fork，並初始化其子模組：`git submodule update --init --recursive`。
3. 在 `src/common.rs` 找到 `read_custom_client` 內的 `const KEY`，只把該常量取代為剛複製的 32 位元組公鑰對應的 Base64 文字。不要取代其他伺服器公鑰，不要將私鑰寫進源碼。
4. 在 Console 設定應用程式名稱、預設值、覆寫值及硬設定；需要保留草稿時點選「儲存預設設定」。再點選「下載簽名 custom.txt」。簽名下載使用當前頁面設定，不等同於儲存草稿；下載後不要再編輯檔案內容。
5. 按該 fork 的 `.github/workflows/flutter-build.yml` 準備 Rust、Flutter、原生依賴及組建環境。當前 README 的部分簡易組建說明針對已棄用的 Sciter，不應當作 Flutter 組建步驟。
6. 準備以下的品牌資源後，使用該平臺的 Flutter 組建和打包流程。桌面腳本入口為 `python3 ./build.py --flutter --hwcodec`，它不是免安裝依賴的一鍵跨平臺組建服務。
7. 按第 6 節把下載的 `custom.txt` 放入實際發佈包的載入位置，再檢查安裝套件是否保留它。停止並重新啟動客戶端及相關後臺進程，檢查應用程式名稱、設定和驗簽結果後再分發。後續設定仍用同一私鑰簽名時，不必僅因設定內容變化而取代源碼公鑰，但需要取代部署的 `custom.txt` 並重啟。

Console 不替你組建、簽署或公證客戶端。Windows Authenticode、macOS codesign/notarization 及移動平臺簽名仍由你自己的發佈流程負責。

## 5. Logo 與套用圖示

當前 Flutter `loadLogo()` 讀取打包資源，不讀取 `HARD_SETTINGS["logo"]`、Base64 圖片或 Console 圖片 URL。簽名 `custom.txt` 不能單獨改變首頁 logo。

把匯出的 PNG 資源放入你自己 fork 的以下位置，然後重新組建 Flutter 資源：

```text
flutter/assets/logo.png
flutter/assets/logo_light.png
flutter/assets/logo_dark.png
flutter/assets/icon.png
```

亮色主題優先 `logo_light.png`，暗色主題優先 `logo_dark.png`，缺失時回退到 `logo.png`。Logo 的顯示區域最大為 300 × 60 個邏輯像素，保持寬高比；這不是檔案必須滿足的像素尺寸。建議用透明 PNG，按實際顯示大小提供高解像度圖。`icon.png` 是介面圖示，缺失或解碼失敗時回退到現有的 `assets/icon.svg`。

系統應用程式圖示需要另行處理，不能由簽名 JSON 修改：

- Windows 可執行檔圖示：`flutter/windows/runner/resources/app_icon.ico`，由 `Runner.rc` 引入。
- macOS 套用圖示：`flutter/macos/Runner/AppIcon.icns`，由 Xcode 資源與 `Info.plist` 引用。
- Linux 安裝套件圖示與桌面入口：檢查 `build.py` 中打包的 `res/128x128@2x.png`、`res/scalable.svg` 及 `.desktop` 檔案。
- Android/iOS：分別需要原生套用資源和簽名流程，桌面資源包不是移動套用組建包。

託盤還可能使用 Flutter bundle 中的 `icon.png`，缺失時使用編譯進 Rust 的平臺資源。因此取代介面圖示不等於取代所有系統、託盤和安裝套件圖示。

## 6. custom.txt 的載入位置

| 目標 | 已核實的載入規則 |
| --- | --- |
| 桌面 debug | 先讀進程工作目錄中的 `./custom.txt`；檔案可讀取時即處理並返回，即使簽名錯誤也不會再嘗試旁邊的檔案。不存在或不可讀時再嘗試可執行檔旁的路徑。 |
| Windows/Linux release | 實際運行的可執行檔所在目錄中的 `custom.txt`，不是隨意選擇的工作目錄。便攜版應核對解包後真正啟動的程式目錄。 |
| macOS release | 可執行檔目錄再進入 `../Resources/custom.txt`，常見套用包路徑為 `YourApp.app/Contents/Resources/custom.txt`。 |
| Android/iOS | 未驗證可用的檔案旁載入部署路徑。當前 Dart 初始化傳入空的 `customClientConfig`；存在 Rust/JNI 字串入口不代表已完成流動版資源注入。 |
| Flutter Web | 不運行這套 Rust 讀取器，不能按桌面檔案路徑載入 `custom.txt`。 |

更換設定後，退出並重新啟動客戶端及相關後臺進程。安裝或更新流程是否複製 `custom.txt`，需要按你實際製作的包驗收。

## 7. 驗收與限制

- 在獨立測試環境確認公鑰相符、`custom.txt` 簽名可驗證，且未把私鑰帶入發佈包。
- 分別檢查已有用戶設定和新設定目錄下的預設值、覆寫值、通訊錄預設及 WebRTC 本地選項，避免把舊值覆寫預設值誤判為簽名失敗。
- 檢查亮色與暗色 logo、系統圖示、安裝後載入路徑、重啟後設定和更新後的資源保留情況。
- 關閉 Console 功能模組後，確認專屬選單隱藏，密鑰和簽名相關請求被後端拒絕。
- 當前客戶端 `src/hbbs_http/record_upload.rs` 的 `ENABLE` 預設是 `false`，未發現啟用賦值；`src/server/video_service.rs` 只有開啟時才建立上載線程。簽名、錄屏策略或 Console 的上載介面不能證明自動錄製上載已經可用。

自有簽名只證明設定來自你信任的私鑰持有者，不提供官方 RustDesk 簽名、官方商業許可、完整 Pro 功能、伺服器端連線 ACL 或即時撤銷保證。也不能阻止能夠修改源碼或取代二進制的用戶移除限制。分發自己的組建時，仍需遵守客戶端及其依賴的許可證和商標要求。
