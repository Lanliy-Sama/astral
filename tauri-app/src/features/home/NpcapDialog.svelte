<script lang="ts">
  // NpcapDialog — 对应 connect_npcap_guard.dart (Windows FakeTCP 前置检查)
  import Dialog from '../../lib/ui/Dialog.svelte'
  import Button from '../../lib/ui/Button.svelte'
  import { npcapDialog } from './npcapDialog.svelte.ts'
  import { snackbar } from '../../lib/ui/snackbar.svelte.ts'

  async function openTutorial() {
    const url = 'https://astral.fan/quick-start/download-install/'
    const win = window.open(url, '_blank')
    if (!win) {
      snackbar.show({
        title: '打开失败',
        message: '无法打开教程页面，请手动访问 astral.fan',
        type: 'error',
      })
    }
  }
</script>

<Dialog bind:open={npcapDialog.open} radius={28} barrierDismissible={true}>
  <div class="npc-title headline-small">需要 Npcap 驱动</div>
  <div class="npc-content body-medium">
    检测到当前连接包含 FakeTCP 服务器。<br />
    Windows 需要先安装 Npcap 驱动后才能使用 FakeTCP。<br /><br />
    是否前往 astral.fan 查看安装教程？
  </div>
  <div class="npc-actions">
    <Button variant="text" onclick={() => (npcapDialog.open = false)}>取消</Button>
    <Button variant="filled" onclick={openTutorial}>查看教程</Button>
  </div>
</Dialog>

<style>
  .npc-title {
    padding: 24px 24px 16px;
  }
  .npc-content {
    padding: 0 24px;
  }
  .npc-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 24px;
  }
</style>
