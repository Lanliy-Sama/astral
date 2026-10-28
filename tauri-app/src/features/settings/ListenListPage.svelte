<script lang="ts">
  // ListenListPage — 对应 listen_list_page.dart
  import BaseSettingsPage from './BaseSettingsPage.svelte'
  import Card from '../../lib/ui/Card.svelte'
  import IconButton from '../../lib/ui/IconButton.svelte'
  import Icon from '../../lib/ui/Icon.svelte'
  import Dialog from '../../lib/ui/Dialog.svelte'
  import Button from '../../lib/ui/Button.svelte'
  import TextField from '../../lib/ui/TextField.svelte'
  import { services } from '../../lib/core/services/services.svelte'
  import { t } from '../../lib/i18n/index.svelte'
  import { M2 } from '../../lib/utils/uiHelpers'

  const s = services()

  let dialogOpen = $state(false)
  let editingIndex = $state<number | null>(null)
  let input = $state('')
  let confirmDelete = $state<number | null>(null)
  let deleteOpen = $state(false)

  function openAdd() {
    editingIndex = null
    input = ''
    dialogOpen = true
  }

  function openEdit(index: number) {
    editingIndex = index
    input = s.playerState.listenList[index]
    dialogOpen = true
  }

  async function save() {
    const v = input.trim()
    if (!v) return
    if (editingIndex !== null && v === s.playerState.listenList[editingIndex]) {
      dialogOpen = false
      return
    }
    if (editingIndex === null) await s.appSettings.addListen(v)
    else await s.appSettings.updateListen(editingIndex, v)
    dialogOpen = false
  }
</script>

<BaseSettingsPage title={t('listen_list')}>
  {#snippet actions()}
    <IconButton icon="add" size={40} padding={8} tip={t('add')} onclick={openAdd} />
  {/snippet}

  {#if s.playerState.listenList.length === 0}
    <div class="empty">
      <Icon name="list_alt" size={64} color="var(--md-sys-color-outline)" />
      <div class="h16"></div>
      <div class="empty-title">暂无监听项</div>
      <div class="h16"></div>
      <Button variant="elevated" icon="add" onclick={openAdd}>{t('add_listen_item')}</Button>
    </div>
  {:else}
    <div class="list">
      {#each s.playerState.listenList as item, i (item)}
        <Card radius={12} margin="0 0 8px 0">
          <div class="item">
            <Icon name="dns" size={24} color="var(--md-sys-color-primary)" />
            <div class="item-text">{item}</div>
            <IconButton icon="edit" iconSize={20} size={40} padding={10} tip={t('edit')} onclick={() => openEdit(i)} />
            <IconButton icon="delete" iconSize={20} size={40} padding={10} tip={t('delete')} onclick={() => {
              confirmDelete = i
              deleteOpen = true
            }} />
          </div>
        </Card>
      {/each}
    </div>
  {/if}
</BaseSettingsPage>

<!-- 添加/编辑 -->
<Dialog bind:open={dialogOpen} radius={28}>
  <div class="dlg-title headline-small">
    {editingIndex === null ? t('add_listen_item') : t('edit_listen_item')}
  </div>
  <div class="dlg-content">
    <TextField bind:value={input} autofocus label={t('listen_item')} hint="localhost:8080" />
  </div>
  <div class="dlg-actions">
    <Button variant="text" onclick={() => (dialogOpen = false)}>{t('cancel')}</Button>
    <Button variant="text" onclick={save}>{editingIndex === null ? t('add') : t('save')}</Button>
  </div>
</Dialog>

<!-- 删除确认 -->
<Dialog bind:open={deleteOpen} radius={28}>
  <div class="dlg-title headline-small">{t('confirm_delete')}</div>
  <div class="dlg-content body-medium">
    {t('confirm_delete_listen_item', {
      item: confirmDelete !== null ? s.playerState.listenList[confirmDelete] : '',
    })}
  </div>
  <div class="dlg-actions">
    <Button variant="text" onclick={() => (deleteOpen = false)}>{t('cancel')}</Button>
    <Button
      variant="text"
      fontColor={M2.red}
      onclick={async () => {
        if (confirmDelete !== null) await s.appSettings.deleteListen(confirmDelete)
        confirmDelete = null
        deleteOpen = false
      }}
    >
      {t('delete')}
    </Button>
  </div>
</Dialog>

<style>
  .empty {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .empty-title {
    font-size: 16px;
    font-weight: 500;
    color: var(--md-sys-color-outline);
  }
  .h16 {
    height: 16px;
  }
  .list {
    padding: 16px;
  }
  .item {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px 4px 16px;
    min-height: 56px;
  }
  .item-text {
    flex: 1;
    min-width: 0;
    font-size: 16px;
  }
  .dlg-title {
    padding: 24px 24px 16px;
  }
  .dlg-content {
    padding: 0 24px;
  }
  .dlg-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 24px;
  }
</style>
