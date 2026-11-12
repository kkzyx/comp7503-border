# 使用已发布镜像部署

公开镜像为 `aazyx774/comp7503-border:1.2.0`，包含应用和一份适量的历史数据。发布与验证记录见 [VALIDATION.md](VALIDATION.md)。

## 全新安装

先安装 Docker 和 Docker Compose。可以克隆完整仓库，也可以只将 `compose.pull.yaml`、`start-pull.sh` 放入新目录。不要复用其他应用的目录或 Compose 项目名；默认项目名为 `comp7503-border`，有冲突时设置不同的 `COMPOSE_PROJECT_NAME`。

macOS / Linux 运行：

```sh
sh start-pull.sh
```

Compose 默认使用上述版本，无需设置镜像名；仅在需要其他镜像时设置 `BORDER_IMAGE`。如果两个镜像均已下载但暂时无法访问镜像仓库，可运行 `BORDER_SKIP_PULL=1 sh start-pull.sh`。

Windows PowerShell 可以直接运行：

```powershell
docker compose -f compose.pull.yaml pull
docker compose -f compose.pull.yaml up -d --no-build --wait --wait-timeout 240
```

打开 `http://127.0.0.1:1880/ui/`。公开镜像无需 Docker Hub 登录；若自行替换为私有镜像，需先登录有权限的账号。如果 1880 已占用，在启动前设置 `BORDER_PORT=1882`（PowerShell 使用 `$env:BORDER_PORT="1882"`）。远程服务器应使用 SSH 隧道或带认证的 HTTPS 反向代理；默认网页仅绑定本机，MongoDB 不向宿主机发布端口。

## 镜像包含什么

- 最新导出的 Flow，以及 Dashboard / MongoDB 节点依赖。MongoDB 作为同一 Compose 网络中的独立服务运行，内部主机名为 `mongodb`。
- 全新安装无需导入 Flow 或安装节点。只有当 Node-RED 数据卷不存在 `flows.json` 时，启动入口才会写入初始 Flow。
- `dataset/history.json.gz` 及日期／校验清单。Node-RED 启动前，`seed-history.js` 会将缺失的历史记录恢复到 MongoDB，相同 ID 的已有记录不会被覆盖。数据包含八个陆路口岸的 **3,226 条每日出境记录（2025-10-01 至 2026-11-11）**，以及 **365 条上水每日雨量记录（2025-10-01 至 2026-09-30）**，无需实时下载即可展示历史图表，并形成 365 组同日雨量／客流配对。详见 [HISTORICAL_DATA.md](HISTORICAL_DATA.md)。
- 不包含凭据、无关集合、私有备份或旧实时快照。恢复后的采集时间保留原值，不把历史记录伪装成新的实时观测。
- 联网后继续检查官方客流／雨量历史档案并采集实时数据。列车历史图需要积累新快照。来源连通性和发布延迟会影响当前数据；API 不可达时显示错误／缺失，不生成假数据。
- 港铁快照、通关快照和当前天气使用 14 天 TTL；每日客流和历史雨量不自动过期。只有明确不需要恢复内置历史时，才在 Node-RED 环境变量中设置 `BORDER_SEED_HISTORY=off`。

## 检查是否正常采集

```sh
docker compose -f compose.pull.yaml ps
docker compose -f compose.pull.yaml logs --tail=100 nodered
docker compose -f compose.pull.yaml exec -T mongodb mongosh --quiet border_insights --eval 'for (const name of ["passengers", "weather", "snapshots", "mtr_snapshots", "weather_live"]) print(name + ": " + db.getCollection(name).countDocuments());'
```

请检查来源时间和三个页面，**容器健康不等于采集成功**。外部 API 被阻断时，初始应有 3,226 条客流和 365 条历史雨量；联网后数量可能增加。周柱状图显示的是香港时间的上一个完整自然周，不是最新七条记录；当快照不覆盖该周时，必须等待新官方数据，留空是正确行为。复现固定快照应使用历史折线和雨量分析，不应将旧日期重标为当前周。

## 已有安装如何更新

更换或拉取镜像不会覆盖已有 Node-RED 数据卷中的 Flow。若要更新旧安装的流程，保留原网络及安全设置，并使用相同 Compose 参数运行 `upgrade.sh`，例如 `sh upgrade.sh -f compose.pull.yaml`。如需指定镜像，保持 `BORDER_IMAGE` 为所选版本。需要保留数据的部署**禁止使用 `down -v`**。

提交作业时应包含完成的报告、导出 Flow、`dataset/`、`HISTORICAL_DATA.md`、准确镜像版本和复现说明。镜像与 ZIP 携带同一份历史数据；仅提供一个在线服务器地址不能保证可复现。
