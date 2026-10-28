<script lang="ts">
  // BottomNav — 对应 bottom_nav.dart: BottomNavigationBar(fixed, 高56)
  import Icon from '../../lib/ui/Icon.svelte'
  import { services } from '../../lib/core/services/services.svelte'
  import { t } from '../../lib/i18n/index.svelte'

  const s = services()

  const items = $derived([
    { icon: 'home_outlined', activeIcon: 'home', label: t('nav_home') },
    { icon: 'room_preferences_outlined', activeIcon: 'room_preferences', label: t('nav_room') },
    { icon: 'build_outlined', activeIcon: 'build', label: '工具' },
    { icon: 'dns_outlined', activeIcon: 'dns', label: t('nav_server') },
    { icon: 'settings_outlined', activeIcon: 'settings', label: t('nav_settings') },
  ])
</script>

<div class="bottom-nav">
  {#each items as item, index}
    <button
      class="bn-item"
      class:selected={s.uiState.selectedIndex === index}
      onclick={() => (s.uiState.selectedIndex = index)}
    >
      <Icon
        name={s.uiState.selectedIndex === index ? item.activeIcon : item.icon}
        size={24}
      />
      {#if s.uiState.selectedIndex === index}
        <div class="bn-label sel">{item.label}</div>
      {:else}
        <div class="bn-label">{item.label}</div>
      {/if}
    </button>
  {/each}
</div>

<style>
  .bottom-nav {
    height: 56px;
    flex-shrink: 0;
    background: var(--md-sys-color-surface-container-low);
    display: flex;
    align-items: stretch;
    box-shadow: 0 -1px 3px rgba(0, 0, 0, 0.08);
  }
  .bn-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    color: var(--md-sys-color-on-surface-variant);
    min-width: 0;
    padding: 0 4px;
  }
  .bn-item.selected {
    color: var(--md-sys-color-primary);
  }
  .bn-label {
    font-size: 10px;
    line-height: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    transition: font-size 0.1s ease;
  }
  .bn-label.sel {
    font-size: 12px;
    line-height: 14px;
    font-weight: 500;
  }
</style>
