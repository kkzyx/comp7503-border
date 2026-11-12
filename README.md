# 跨境接驳出行监测 — 精简版

这是一个 COMP7503A 课程的 Node-RED 项目：监测罗湖、落马洲支线的通关和列车信息，分析每日客流与雨量，并比较多个陆路口岸的客流趋势。

## 快速运行

先安装 Docker 和 Docker Compose；macOS / Windows 用户需要启动 Docker Desktop。然后运行：

```sh
git clone https://github.com/kkzyx/comp7503-border.git
cd comp7503-border
sh start-pull.sh
```

打开 **http://127.0.0.1:1880/ui/** 即可。无需自行构建镜像、导入 Flow 或安装节点。脚本会拉取公开镜像 `aazyx774/comp7503-border:1.2.0`，同时启动 MongoDB，并在首次启动时自动恢复 **3,226 条客流记录和 365 条雨量记录**。实时看板仍需要访问官方 API，并等待新数据采集；附带的历史数据不是实时数据。

如果 1880 端口被占用，运行 `BORDER_PORT=1882 sh start-pull.sh`，改用 1882 端口访问。Windows PowerShell 命令和检查步骤见 [镜像部署说明](DEPLOY_FROM_HUB.md)。停止服务可运行 `docker compose -f compose.pull.yaml stop`，再次运行启动脚本即可恢复。请保留数据卷，以保存已采集的数据。

默认网页仅绑定本机地址。服务器远程访问应使用 SSH 隧道或带身份认证的 HTTPS 反向代理，不要公开暴露编辑器或 MongoDB。如果已有其他安装使用 `comp7503-border` 项目名，请设置不同的 `COMPOSE_PROJECT_NAME`。

## 为什么有这些文件

仓库同时提供「直接运行」和「修改源码」两种用途，因此不只有一个 Flow 文件。

| 文件或目录 | 用途 | 仅运行时是否需要操作 |
| --- | --- | --- |
| `compose.pull.yaml`、`start-pull.sh` | 拉取镜像并启动 Node-RED 和 MongoDB | 需要，按上面的命令运行 |
| `Border.Insights.Flow.json` | 可导入 Node-RED 的完整流程，也是作业交付文件 | 无需手动导入，镜像已内置 |
| `dataset/` | 官方公开历史数据及校验清单，便于检查和复现 | 无需手动导入，镜像已内置 |
| `src/simple/`、`build_flow.py` | 节点函数、界面模板和 Flow 生成程序 | 仅修改项目时需要 |
| `Dockerfile`、`bootstrap.sh`、`seed-history.js` | 构建镜像、初始化 Flow 和恢复历史数据 | 使用现成镜像时无需操作 |
| `compose.yaml`、`start.sh`、`compose.hub.yaml` | 从源码构建或使用其他部署配置 | 按需使用 |
| `upgrade.sh`、`backup.sh`、`deploy.py`、`export_dataset.py` | 升级、备份、开发部署和导出数据 | 按需使用 |
| 各个 `.md` 文件 | 安装、服务器部署、数据口径、验证记录和报告提纲 | 按需阅读 |

**如果只想运行，准备 `compose.pull.yaml` 和 `start-pull.sh` 即可**，不需要逐个处理其他文件。完整仓库是为了方便朋友修改，以及老师检查实现和历史数据。私有备份、凭据和缓存没有上传。

## 规模与界面

导出的 Flow 共 **70 个节点**，包含配置、页面和编辑器分组节点。一个编辑器标签页内分为五个区域；此前的精简版有 63 个节点，第三个页面增加了七个节点，原有展示保留。

采用经典版 Dashboard，三个页面的界面文字保持英文：

1. **Live Connections（实时接驳）**：罗湖、落马洲支线的居民入境和出境通关等级分别展示，配合前往口岸的列车预测、后续列车表、区域天气和近期列车预测历史图。
2. **Passenger & Rainfall（客流与雨量）**：口岸与时间范围筛选、每日客流折线图、每日／工作日／周末均值、Pearson 相关系数、有雨／少雨日均值及散点图。
3. **Border Traffic Trends（口岸客流趋势）**：可同时选择八个陆路口岸中的多个口岸，查看最近 30 / 90 / 365 个有数据日期的香港居民出境客流。星期一至星期日柱状图显示香港时间下的**上一个完整自然周**，与折线图的时间筛选独立。摘要显示两个日期范围及各口岸的一周数据覆盖率。例如，2026 年 11 月 12 日和 11 月 15 日均显示 11 月 2—8 日；到 11 月 16 日星期一 00:00，改为显示 11 月 9—15 日。未发布或缺失的日期留空，不填零、不替换为其他星期。

普通图表使用 `ui_chart`，卡片、表格和散点图使用少量 `ui_template`。四个筛选控件的状态按浏览器独立保存。历史客流分析口径为**香港居民出境人次**，实时通关卡片则分别展示入境和出境。列车预测取上水站开往 LOW（罗湖）和 LMC（落马洲支线）的记录。无需单独开发前端网站。

架构参考课程 Demo 以及对往届小型天气项目的描述；本次修订时未取得其原始附件，不声称核验或直接复制了其代码。所有历史图表都从 MongoDB 查询，不依赖仅保存在内存中的图表历史。

## 采集 → MongoDB → 展示

| 数据 | 本项目请求间隔 | 集合与去重键 |
| --- | --- | --- |
| 港铁上水站东铁线列车预测 | 10 秒 | `mtr_snapshots`：车站 + 10 秒采样时间段 |
| 两个铁路口岸的居民入境／出境通关等级 | 15 分钟 | `snapshots`：口岸 + 居民类别 + 方向 + 15 分钟时间段 |
| 天文台当前温度、区域过去一小时雨量 | 15 分钟 | `weather_live`：站点 + 指标 + 来源时间 |
| 八个陆路口岸每日出境客流 CSV | 每 6 小时检查一次 | `passengers`：日期 + 口岸 + 方向 |
| 上水每日历史雨量 | 每 6 小时检查一次 | `weather`：SSH + rainfall + 日期 |

上述间隔是项目的轮询设置，**不代表官方以相同频率发布新数据**。实时组件每 10 秒查询 MongoDB，历史组件每 60 秒查询一次。实时数据共享；历史筛选状态按浏览器隔离，已被新查询替代的旧响应会被忽略。

为让历史图表只发给对应浏览器，经典版 Dashboard 图表的动态 `className` 设置为 `{{msg.socketid}}`，借助动态字段处理将 `msg.socketid` 带入图表更新消息。否则，即使模板和筛选消息已隔离，原生图表仍可能广播。连接或切换页面后，在 Dashboard 回放初始缓存状态之后再次执行带响应保护的查询，恢复该浏览器自己的选择。公共的实时列车历史图不做这种隔离。

采集时检查类型、日期和旅客分类合计。未知天气不填零，维护／非服务时段／过期状态不视为正常。使用 upsert，避免同一采样时段或来源观测被重复插入。`sourceAt` / `sourceModifiedAt` 表示来源时间，区别于采集时间 `observedAt`。MongoDB 存储 UTC 日期，日期匹配与显示使用香港时间。

港铁、通关和当前天气记录使用 **14 天 TTL**；每日客流和历史雨量长期保留。精简版不生成长期港铁小时汇总。六小时列车历史图按五分钟分组计算预测值均值，不是实际延误或实测等候时间。TTL 删除是异步的。不涉及其他集合或老师的 Temperature 示例流程。

当前天气使用打鼓岭温度及天文台 **North District（北区）过去一小时最大雨量**，不是上水雨量站读数。历史每日雨量仍来自上水。二者均为区域参考指标，不是口岸现场仪器数据。过期来源显示为「—」。

## 保留的分析

- 每日香港居民出境人次、所选范围均值、工作日／周末均值。
- 按香港日期匹配每日客流与雨量，仅使用天文台完整标记为 `C` 的有效数值。
- 有效配对不少于 30 组、且两个变量均有变化时才计算 Pearson r。
- 有雨日（≥1 mm）与少雨／无雨日（<1 mm）的客流均值，同时显示样本数。
- 显示实际配对日期；历史天气发布滞后时，分析终止日可以早于最新客流日期。
- 可多选罗湖、落马洲支线、落马洲、深圳湾、香园围、港珠澳大桥、文锦渡和沙头角，最多八个。清空选择后恢复罗湖与落马洲支线。
- 比较折线图采用所有选中口岸共同的最近 N 个不同数据日期，不为每个口岸单独挑选 N 天。周柱状图独立查询上一个完整自然周，显示真实每日人数，不是星期平均值。官方发布的零值保留；缺失记录留空，并显示一周七天的数据覆盖率。

不作因果、预测或统计显著性声明。工作日、节假日、季节性及序列相关等混杂因素仍然存在，详见 [分析方法](WEATHER_ANALYSIS.md)。

## 相比完整版删减的内容

移除了入境客流／访客分析模式、额外三个港铁站点／方向、多站历史天气、历史温度相关性、Spearman 和按星期中心化的系数、小时级港铁／雨量关联、热力图、通关／客流相关性、排名、饼图、明细表、自定义 JSON HTTP API，以及独立的查询／看板编辑器标签页。当前版本仍有双向居民通关状态和八口岸出境客流采集。

旧完整版仅在本地 `backups/border-full-169-nodes.zip` 留存，不随仓库或镜像发布。已有 MongoDB 数据和老师的 Temperature 示例保持不变。

## 开发与更新

原开发 Mac 的课程平台使用相邻目录 `../comp7503-platform/compose.yaml`，项目名为 `comp7503-assignment`。其看板为 http://127.0.0.1:1880/ui/，编辑器为 http://127.0.0.1:1880/，Mongo Express 为 http://127.0.0.1:8081/，数据库为 `border_insights`。**这些是原开发环境信息，不是朋友运行时的额外依赖。**

```sh
python3 build_flow.py
python3 deploy.py
```

导出的 Flow 已包含运行所需的函数和模板，导入后无需读取本地 JS 文件。Dockerfile 安装 `node-red-dashboard@3.6.6` 和 `node-red-contrib-mongodb3@2.0.1`。Docker 内部 MongoDB 地址为 `mongodb://mongodb:27017/border_insights`。

`deploy.py` 使用已知稳定 ID，只替换本项目的新旧编辑器及 Dashboard 配置，保留修订检查并备份旧 Flow；同时移除旧完整版采集器，避免两套并行运行。不要在旧应用旁重复导入一份。

新机器若要**从源码构建**，运行 `sh start.sh`；只想运行请优先用首页的 `sh start-pull.sh`。不要在已占用端口上另启一套。重建镜像不会覆盖已有数据卷中的 Flow。服务器说明见 [SERVER_DEPLOYMENT.md](SERVER_DEPLOYMENT.md)。为兼容课程要求采用经典版 Dashboard，编辑器应保持私有。

朋友或老师使用公开镜像即可免构建运行；启动时补齐缺失历史数据，不覆盖相同 ID 的已有记录。相同 `dataset/` 也随提交 ZIP 提供，详见 [历史数据说明](HISTORICAL_DATA.md) 和 [验证记录](VALIDATION.md)。

已有独立云部署且编辑器关闭时，将新导出文件与 `upgrade.sh` 上传至原目录，保留服务器 Compose 和安全配置，运行 `sh upgrade.sh`。它会备份并仅合并本项目节点，保留其他节点及 MongoDB 数据卷，使用现有镜像重建 Node-RED 容器而不重新构建镜像。若原部署使用 Hub 覆盖配置，保持原 `BORDER_IMAGE`，运行 `sh upgrade.sh -f compose.yaml -f compose.hub.yaml`。升级时不要并发编辑或部署；错误也会输出到 Docker 日志。

## 数据来源与交付

- 港铁：[列车预测](https://data.gov.hk/en-data/dataset/mtr-data2-nexttrain-data)
- 入境事务处：[陆路口岸等候时间](https://data.gov.hk/en-data/dataset/hk-immd-set28-land-boundary-control-points-waiting-time)
- 入境事务处：[每日旅客流量](https://data.gov.hk/en-data/dataset/hk-immd-set5-statistics-daily-passenger-traffic)
- 天文台：[当前天气报告](https://data.gov.hk/en-data/dataset/hk-hko-rss-current-weather-report)
- 天文台：[上水每日历史雨量 CSV](https://data.weather.gov.hk/weatherAPI/cis/csvfile/SSH/ALL/daily_SSH_RF_ALL.csv)

原始数据属于港铁、入境事务处和香港天文台。本项目仅用于教学，并非官方服务。仓库包含 Flow、Docker 说明、可编辑源码和报告提纲，**不等于已经完成小组报告或最终课程提交**。
