/**
 * Bridge — Rust 后端调用抽象层
 *
 * - Tauri 环境: 通过 invoke() 调用 src-tauri/src/commands.rs 中的同名 command,
 *   后端转调原 rust/ crate (EasyTier) 的 API (见 commands.rs 中的集成说明)。
 * - 纯浏览器/未接后端: 自动回退 MockBackend, 保持 UI 行为完全一致。
 */
import type {
  KVNetworkStatus,
  NetworkTestResult,
  FlagsC,
  MagicWallRuleModel,
  MagicWallStatus,
} from '../models/types'
import { Platform } from '../../platform'
import { MockBackend } from './mockBackend'

export interface CreateServerOptions {
  username: string
  enableDhcp: boolean
  specifiedIp: string
  roomName: string
  roomPassword: string
  severurl: string[]
  onurl: string[]
  cidrs: string[]
  flags: FlagsC
}

class AstralBridge {
  private mock = new MockBackend()
  private useMock = !Platform.isTauri

  private async call<T>(cmd: string, args?: Record<string, unknown>, mockFn?: () => Promise<T>): Promise<T> {
    if (this.useMock || !mockFn) {
      return mockFn!()
    }
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      return await invoke<T>(cmd, args)
    } catch (e) {
      // command 不存在 / 后端异常 → 回退 mock, 保证 UI 不崩
      console.warn(`[bridge] command '${cmd}' failed, falling back to mock:`, e)
      this.useMock = true
      return mockFn!()
    }
  }

  /** 显式强制 mock 模式 (调试用) */
  forceMock(v: boolean) {
    this.useMock = v
  }

  get isMock() {
    return this.useMock
  }

  // ---------- simple ----------
  easytierVersion(): Promise<string> {
    return this.call('easytier_version', undefined, () => this.mock.easytierVersion())
  }
  isEasytierRunning(): Promise<boolean> {
    return this.call('is_easytier_running', undefined, () => this.mock.isEasytierRunning())
  }
  getIps(): Promise<string[]> {
    return this.call('get_ips', undefined, () => this.mock.getIps())
  }
  getRunningInfo(): Promise<string> {
    return this.call('get_running_info', undefined, () => this.mock.getRunningInfo())
  }
  createServer(opts: CreateServerOptions): Promise<string> {
    return this.call('create_server', { opts }, () => this.mock.createServer(opts))
  }
  closeServer(): Promise<void> {
    return this.call('close_server', undefined, () => this.mock.closeServer())
  }
  getNetworkStatus(): Promise<KVNetworkStatus> {
    return this.call('get_network_status', undefined, () => this.mock.getNetworkStatus())
  }
  initApp(): Promise<void> {
    return this.call('init_app', undefined, async () => {})
  }

  // ---------- NAT ----------
  testNetworkConnectivity(stunServer: string): Promise<NetworkTestResult> {
    return this.call(
      'test_network_connectivity',
      { stunServer },
      () => this.mock.testNetworkConnectivity(stunServer),
    )
  }

  // ---------- 防火墙 ----------
  getFirewallStatus(profileIndex: number): Promise<boolean> {
    return this.call(
      'get_firewall_status',
      { profileIndex },
      () => this.mock.getFirewallStatus(profileIndex),
    )
  }
  setFirewallStatus(profileIndex: number, enable: boolean): Promise<void> {
    return this.call(
      'set_firewall_status',
      { profileIndex, enable },
      () => this.mock.setFirewallStatus(profileIndex, enable),
    )
  }

  // ---------- 跃点 ----------
  getAllInterfacesMetrics(): Promise<[string, number][]> {
    return this.call(
      'get_all_interfaces_metrics',
      undefined,
      () => this.mock.getAllInterfacesMetrics(),
    )
  }
  setInterfaceMetric(interfaceName: string, metric: number): Promise<void> {
    return this.call(
      'set_interface_metric',
      { interfaceName, metric },
      () => this.mock.setInterfaceMetric(interfaceName, metric),
    )
  }
  checkSudo(): Promise<boolean> {
    return this.call('check_sudo', undefined, () => this.mock.checkSudo())
  }

  // ---------- 魔法墙 ----------
  startMagicWall(): Promise<void> {
    return this.call('start_magic_wall', undefined, () => this.mock.startMagicWall())
  }
  stopMagicWall(): Promise<void> {
    return this.call('stop_magic_wall', undefined, () => this.mock.stopMagicWall())
  }
  addMagicWallRule(rule: MagicWallRuleModel): Promise<void> {
    return this.call('add_magic_wall_rule', { rule }, () => this.mock.addMagicWallRule(rule))
  }
  removeMagicWallRule(ruleId: string): Promise<void> {
    return this.call(
      'remove_magic_wall_rule',
      { ruleId },
      () => this.mock.removeMagicWallRule(ruleId),
    )
  }
  updateMagicWallRule(rule: MagicWallRuleModel): Promise<void> {
    return this.call('update_magic_wall_rule', { rule }, () => this.mock.updateMagicWallRule(rule))
  }
  getMagicWallStatus(): Promise<MagicWallStatus> {
    return this.call('get_magic_wall_status', undefined, () => this.mock.getMagicWallStatus())
  }
  getNtPath(dosPath: string): Promise<string | null> {
    return this.call('get_nt_path', { dosPath }, () => this.mock.getNtPath(dosPath))
  }
}

export const bridge = new AstralBridge()
