# Keyword presets / 关键词预设

[Back to README](../README.md) · [返回中文 README](../README.zh-CN.md)

Copy a block over the matching `Config` constant in the script. / 将下方代码块复制替换脚本中对应的配置常量。

## Script 12 · Parameter extraction / 参数提取

### Canopy photosynthesis & crop modelling / 冠层光合与作物模型

```js
const KEYWORDS = [
  "Vcmax", "Jmax", "Rd", "quantum yield", "量子效率",
  "leaf area index", "LAI", "叶面积指数",
  "leaf angle", "leaf inclination", "叶倾角",
  "extinction coefficient", "消光系数",
  "PPFD", "PAR", "μmol m-2 s-1",
  "stomatal conductance", "气孔导度"
];
```

### Field agronomy / 田间农学

```js
const KEYWORDS = [
  "planting density", "种植密度", "plants m-2",
  "nitrogen rate", "kg N ha", "施氮量",
  "irrigation", "drip", "滴灌", "灌溉量",
  "sowing date", "播期",
  "cultivar", "品种",
  "temperature", "°C"
];
```

### Remote sensing & phenotyping / 遥感与表型

```js
const KEYWORDS = [
  "flight altitude", "飞行高度", "GSD", "ground sampling distance",
  "spatial resolution", "空间分辨率",
  "multispectral", "hyperspectral", "LiDAR", "激光雷达",
  "point cloud", "点云",
  "NDVI", "RMSE", "R2", "R²"
];
```

## Script 13 · Screening / 初筛

```js
// AI-based crop phenotyping / 基于人工智能的作物表型
const GROUP_A = ["deep learning", "machine learning", "convolutional neural network", "transformer", "深度学习", "机器学习"];
const GROUP_B = ["phenotyping", "phenotype", "plant trait", "表型"];
const EXCLUDE_TITLE = ["systematic review", "meta-analysis", "survey", "综述"];
```

```js
// 3D canopy reconstruction & light modelling / 三维冠层重建与光分布模拟
const GROUP_A = ["3D reconstruction", "point cloud", "structure from motion", "LiDAR", "三维重建", "点云"];
const GROUP_B = ["canopy", "light interception", "ray tracing", "photosynthesis", "冠层", "光截获", "光线追踪"];
const EXCLUDE_TITLE = ["review", "综述"];
```

## Script 14 · Topic trends / 主题趋势

```js
const TOPICS = {
  "Process-based models": ["crop model", "process-based model", "APSIM", "DSSAT", "作物模型"],
  "Functional-structural": ["functional-structural plant model", "FSPM", "GroIMP", "OpenAlea", "功能结构模型"],
  "Machine learning": ["machine learning", "random forest", "gradient boosting", "机器学习"],
  "Deep learning": ["deep learning", "convolutional neural network", "transformer", "深度学习"],
  "UAV / satellite": ["UAV", "drone", "satellite", "Sentinel-2", "无人机", "卫星"],
  "LLM / agents": ["large language model", "LLM", "AI agent", "大语言模型"]
};
```

Tip / 提示：with `WHOLE_WORD = true`, `"UAV"` matches "UAV" and "UAVs" but not unrelated words; Chinese keywords always use substring matching. / 整词匹配时 “UAV” 可匹配 “UAVs”；中文关键词始终按子串匹配。
