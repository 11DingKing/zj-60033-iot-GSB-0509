<template>
  <router-view />
</template>

<script setup lang="ts"></script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body,
#app {
  height: 100%;
  width: 100%;
  font-family:
    "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB",
    "Microsoft YaHei", Arial, sans-serif;
}

.el-menu {
  border-right: none !important;
}

.status-online {
  color: #67c23a;
}

.status-offline {
  color: #909399;
}

.status-fault {
  color: #f56c6c;
}

.alert-emergency {
  color: #f56c6c;
  font-weight: bold;
}

.alert-warning {
  color: #e6a23c;
}

.alert-info {
  color: #909399;
}
</style>
