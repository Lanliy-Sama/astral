<script lang="ts">
  // ServerDialog — 对应 server_dialog.dart: 名称/地址 + 协议开关组
  import Dialog from '../../lib/ui/Dialog.svelte'
  import Button from '../../lib/ui/Button.svelte'
  import TextField from '../../lib/ui/TextField.svelte'
  import Switch from '../../lib/ui/Switch.svelte'
  import { serverDialog } from './serverDialog.svelte.ts'
  import { services } from '../../lib/core/services/services.svelte'
  import { isBlockedServer } from '../../lib/core/storage/storage'

  const s = services()

  const PROTOCOLS = [
    'tcp',
    'faketcp',
    'udp',
    'ws',
    'wss',
    'quic',
    'wg',
    'txt',
    'srv',
    'http',
    'https',
  ] as const
  type Proto = (typeof PROTOCOLS)[number]

  let name = $state('')
  let url = $state('')
  let protos = $state<Record<Proto, boolean>>({} as any)
  let nameError = $state('')
  let urlError = $state('')

  $effect(() => {
    if (serverDialog.open) {
      nameError = ''
      urlError = ''
      if (serverDialog.isEdit && serverDialog.server) {
        const sv = serverDialog.server
        name = sv.name
        url = sv.url
        protos = {
          tcp: sv.tcp,
          faketcp: sv.faketcp,
          udp: sv.udp,
          ws: sv.ws,
          wss: sv.wss,
          quic: sv.quic,
          wg: sv.wg,
          txt: sv.txt,
          srv: sv.srv,
          http: sv.http,
          https: sv.https,
        }
      } else {
        name = ''
        url = ''
        protos = {
          tcp: true,
          faketcp: false,
          udp: true,
          ws: false,
          wss: false,
          quic: false,
          wg: false,
          txt: false,
          srv: false,
          http: false,
          https: false,
        }
      }
    }
  })

  let urlDisabled = $derived(serverDialog.isEdit && isBlockedServer(url))

  function save() {
    nameError = name.trim() ? '' : '请输入服务器名称'
    urlError = url.trim() ? '' : '请输入服务器地址'
    if (nameError || urlError) return

    if (serverDialog.isEdit && serverDialog.server) {
      const sv = {
        ...serverDialog.server,
        name: name.trim(),
        url: urlDisabled ? serverDialog.server.url : url.trim(),
        ...protos,
      }
      s.server.updateServer(sv)
    } else {
      s.server.addServer({
        id: 0,
        name: name.trim(),
        url: url.trim(),
        enable: false,
        ...protos,
        sortOrder: 0,
      })
    }
    serverDialog.open = false
  }
</script>

<Dialog bind:open={serverDialog.open} radius={28}>
  <div class="dlg-title headline-small">
    {serverDialog.isEdit ? '编辑服务器' : '添加服务器'}
  </div>
  <div class="dlg-content">
    <TextField bind:value={name} label="服务器名称" hint="输入服务器名称" errorText={nameError} />
    <div class="h16"></div>
    <TextField
      bind:value={url}
      label="服务器地址"
      hint="输入服务器地址"
      disabled={urlDisabled}
      helperText={urlDisabled ? '此服务器地址不可修改' : undefined}
      errorText={urlError}
    />
    <div class="h24"></div>
    <div class="bold">支持的协议:</div>
    <div class="h8"></div>
    <div class="proto-wrap">
      {#each PROTOCOLS as p (p)}
        <div class="proto-item">
          <Switch bind:checked={protos[p]} />
          <span class="gap8"></span>
          <span class="proto-label">{p.toUpperCase()}</span>
        </div>
      {/each}
    </div>
  </div>
  <div class="dlg-actions">
    <Button variant="text" onclick={() => (serverDialog.open = false)}>取消</Button>
    <Button variant="elevated" onclick={save}>
      {serverDialog.isEdit ? '保存' : '添加'}
    </Button>
  </div>
</Dialog>

<style>
  .dlg-title {
    padding: 24px 24px 16px;
  }
  .dlg-content {
    padding: 0 24px;
    display: flex;
    flex-direction: column;
    max-height: 55vh;
    overflow-y: auto;
  }
  .dlg-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 24px;
  }
  .h8 {
    height: 8px;
  }
  .h16 {
    height: 16px;
  }
  .h24 {
    height: 24px;
  }
  .bold {
    font-weight: 700;
  }
  .proto-wrap {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 16px;
  }
  .proto-item {
    display: flex;
    align-items: center;
  }
  .gap8 {
    width: 8px;
  }
  .proto-label {
    font-size: 14px;
  }
</style>
