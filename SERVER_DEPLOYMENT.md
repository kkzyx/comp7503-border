# 服务器私有部署说明

公开 Docker Hub 镜像 `aazyx774/comp7503-border:1.2.0` 已发布并完成本地验证，但发布镜像不会自动更新华为云主机；这里不声称已经代为完成云服务器部署。本地测试使用 Docker Desktop ARM64，包含 AMD64 应用模拟运行，不是原生 AMD64 云主机验证。

2026 年 11 月 12 日，用户报告在华为云服务器上使用 IPv4 优先、关闭网络地址族自动选择后，两个入境处来源均下载成功。单独下载成功仍不能证明云端 Flow 已正确解析、写库并恢复看板，需按下述步骤检查。

## 启动

按 [Docker 官方安装说明](https://docs.docker.com/engine/install/) 安装 Docker Engine 和 Compose，并在服务器实际所在区域检查官方数据来源及镜像仓库的 HTTPS 连通性。上传本项目时不要包含 `backups/`。

使用已发布镜像可按 [DEPLOY_FROM_HUB.md](DEPLOY_FROM_HUB.md) 运行 `sh start-pull.sh`。如果希望从源码构建，运行：

```sh
sh start.sh
docker compose ps
curl -fsS http://127.0.0.1:1880/ui/ >/dev/null
docker compose logs --tail=60 nodered
```

如果 1880 已占用，在 `.env` 设置 `BORDER_PORT=1882`。`1.2.0` 镜像会先恢复内置历史数据，再启动 70 节点 Flow 并检查官方 API 更新。HTTP 健康检查只证明网页可用，还需检查来源成功／错误消息和 MongoDB 记录。

**注意：以下未带 `-f` 的命令针对默认 `compose.yaml`。若使用拉取镜像方式，所有操作均加上 `-f compose.pull.yaml`；若使用旧 Hub 覆盖方式，则保持原来的两个 `-f` 参数。不要混用配置创建另一套部署。**

## 入境处连接超时

Compose 已将 `NODE_OPTIONS` 设置为 `--dns-result-order=ipv4first --no-network-family-autoselection`。这会将用户云端下载测试成功的连接设置应用到真正运行的 Node-RED 进程，而不只是诊断子进程。它优先使用 IPv4 并关闭网络地址族自动竞争连接，不关闭 TLS 验证，也不会自动补回错过的实时观测。

已有部署可在 `nodered` 服务下添加此环境变量，保留其他必要 Node 参数，然后使用原数据卷和镜像重建服务：

```sh
docker compose up -d --no-build --force-recreate nodered
docker compose exec -T nodered node -p 'process.env.NODE_OPTIONS'
```

若原部署使用 Hub 覆盖配置，保持 `-f compose.yaml -f compose.hub.yaml` 和原 `BORDER_IMAGE`。只运行 `docker compose restart` 不会应用修改后的环境配置。不要删除数据卷。启动会触发新采集，约一分钟后检查 `passengers` 数量，以及最新居民通关快照的 `observedAt`、`sourceFresh`，再刷新看板。诊断下载成功不等于 Flow 解析及写库成功。

不要将 1880 / 27017 / 8081 直接暴露到公网。只允许可信来源访问 SSH，在自己的电脑运行：

```sh
ssh -N -L 1888:127.0.0.1:1880 USER@SERVER
```

将 `USER@SERVER` 替换为实际用户名和服务器地址，打开 http://127.0.0.1:1888/ui/。如果服务器使用 1882，将隧道右侧端口改为 1882。对外提供访问应配置 HTTPS、身份认证、编辑器／管理 API 限制及 Dashboard WebSocket 转发，而不是简单公开绑定端口。参阅 [Node-RED 安全说明](https://nodered.org/docs/user-guide/runtime/securing-node-red)。

## 单独迁移额外的本地数据

`1.2.0` 镜像仅包含 [HISTORICAL_DATA.md](HISTORICAL_DATA.md) 描述的适量公开快照，不是整个累计数据库。原开发 Mac 的数据属于 `comp7503-assignment`，与独立部署不同。如需额外的私有备份或实时历史，应单独传输，不能公开发布未经审查的备份。

在本项目目录执行；最好先暂停写入和编辑器变更：

```sh
mkdir -p backups
docker compose -f ../comp7503-platform/compose.yaml exec -T mongodb \
  mongodump --db border_insights --archive --gzip > backups/border-local.archive.gz
```

上述相邻平台路径只适用于原开发环境。将备份安全地传到服务器，优先恢复到空数据库；若需合并已有集合，先保留双方备份。以下命令不主动删除现有数据：

```sh
docker compose stop nodered
docker compose exec -T mongodb mongorestore --archive --gzip \
  --nsInclude='border_insights.*' < backups/border-local.archive.gz
docker compose start nodered
```

相同 ID 的记录可能因重复键错误而跳过。写入期间生成的备份不保证是跨集合的同一时间点快照。旧列车、通关和当前天气记录迁移后仍会按照 14 天 TTL 到期。不要将未经审查的备份上传 Docker Hub 或公开仓库。

## 升级与备份

`sh backup.sh` 面向默认独立 Compose 配置；原 Mac 平台应明确使用上面的旧平台 Compose 路径。依赖备份前先验证能否恢复。`docker compose down` 保留数据卷，**真实部署禁止使用 `down -v`**。

### 更新已有云部署，包括编辑器已关闭的情况

只上传新的 `Border.Insights.Flow.json` 和 `upgrade.sh` 到服务器原项目目录。保留已经可用的 Compose、访问控制、Node 参数、镜像名、项目名和数据卷。不要整目录覆盖定制过的服务器配置，也不要为了升级而开启公网编辑器。升级期间暂停其他编辑／部署活动。

在原目录，使用与首次部署相同且有 Docker 权限的用户运行：

```sh
sh upgrade.sh
```

若原部署使用 Hub 覆盖配置，保持原来导出的 `BORDER_IMAGE`，运行：

```sh
sh upgrade.sh -f compose.yaml -f compose.hub.yaml
```

脚本会复制自包含的 Flow，将 `/data/flows.json` 备份到 `/data/border-backups/`，只合并已知属于本项目的编辑器／界面节点，并使用当前镜像重建 Node-RED，不重新构建镜像。其他节点、设置、凭据及 MongoDB 数据卷均保留，不需要管理 HTTP API。已有镜像必须已安装所需 Dashboard / MongoDB 节点，之前的精简版镜像满足此条件。

等待启动采集后刷新浏览器，检查三个页面。通过 `docker compose logs --tail=100 nodered` 检查采集／查询错误；错误 Debug 节点也会写入 Docker 日志。确认两个口岸、两个方向共四条新居民通关快照，以及八个陆路口岸近期客流。API 失败仍在下次计划采集时重试，没有额外的重试队列。

如需回滚，在没有并发编辑的情况下，将脚本输出的备份路径替换到以下命令：`docker compose exec -T nodered cp BACKUP_PATH /data/flows.json`，然后重启 Node-RED。MongoDB 数据保持不变。Hub 部署继续保留相同 `-f` 参数。

### 编辑器开启时的本地开发

```sh
python3 build_flow.py
docker compose up -d --build --wait --wait-timeout 240
python3 deploy.py --url http://127.0.0.1:1880
```

可在服务器运行部署脚本，或在 Mac 上通过 SSH 隧道地址访问。重建镜像刻意不覆盖已有 `/data/flows.json`。保持相同项目名才能继续使用相同数据卷。

## 自行发布其他 Docker Hub 版本

使用现有公开镜像或在服务器构建都可以，无需为了运行再发布一次。若要发布自己的版本，需要登录有权限的账号。以下为多架构命令模板，不表示已替你发布该模板中的账号：

```sh
docker login
docker buildx build --platform linux/amd64,linux/arm64 \
  -t USERNAME/comp7503-border:1.2.0 --push .
```

将 `USERNAME` 替换为自己的 Docker Hub 用户名。在服务器运行：

```sh
export BORDER_IMAGE=USERNAME/comp7503-border:1.2.0
docker compose -f compose.yaml -f compose.hub.yaml pull
docker compose -f compose.yaml -f compose.hub.yaml up -d --no-build --wait --wait-timeout 240
```

后续操作持续使用相同两个 Compose 文件参数。MongoDB 镜像和其数据卷仍与应用镜像分开。
