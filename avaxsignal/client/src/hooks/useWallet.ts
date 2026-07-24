/**
 * useWallet.ts — MetaMask wallet hook
 *
 * Handles: connect, disconnect, network switching, balance fetching,
 * and client-side transaction signing on Fuji testnet.
 */

import { useState, useEffect, useCallback } from 'react'
import { BrowserProvider, parseEther, formatEther } from 'ethers'

// ─── Fuji Testnet Config ─────────────────────────────────────────────

const FUJI_CHAIN_ID = 43113
const FUJI_CHAIN_HEX = '0xA869'

const FUJI_NETWORK_PARAMS = {
  chainId: FUJI_CHAIN_HEX,
  chainName: 'Avalanche Fuji Testnet',
  nativeCurrency: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 },
  rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
  blockExplorerUrls: ['https://testnet.snowtrace.io/'],
}

// ─── Types ────────────────────────────────────────────────────────────

export interface WalletState {
  account: string | null
  balance: string | null
  chainId: number | null
  isConnected: boolean
  isCorrectNetwork: boolean
  isConnecting: boolean
  error: string | null
}

export interface SwapResult {
  txHash: string
  snowtraceUrl: string
}

declare global {
  interface Window {
    ethereum?: any
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    account: null,
    balance: null,
    chainId: null,
    isConnected: false,
    isCorrectNetwork: false,
    isConnecting: false,
    error: null,
  })

  // ── Helpers ──────────────────────────────────────────────────────

  const fetchBalance = useCallback(async (account: string): Promise<string> => {
    const provider = new BrowserProvider(window.ethereum)
    const raw = await provider.getBalance(account)
    return parseFloat(formatEther(raw)).toFixed(4)
  }, [])

  const updateAccount = useCallback(async (account: string | null) => {
    if (!account) {
      setState(prev => ({
        ...prev,
        account: null, balance: null, chainId: null,
        isConnected: false, isCorrectNetwork: false,
      }))
      return
    }

    try {
      const chainHex: string = await window.ethereum.request({ method: 'eth_chainId' })
      const chainId = parseInt(chainHex, 16)
      const balance = await fetchBalance(account)

      setState(prev => ({
        ...prev,
        account,
        balance,
        chainId,
        isConnected: true,
        isCorrectNetwork: chainId === FUJI_CHAIN_ID,
        error: null,
        isConnecting: false,
      }))
    } catch {
      setState(prev => ({ ...prev, isConnecting: false }))
    }
  }, [fetchBalance])

  // ── Event listeners (account / chain change) ──────────────────────

  useEffect(() => {
    if (!window.ethereum) return

    const onAccountsChanged = (accounts: string[]) => {
      updateAccount(accounts[0] ?? null)
    }
    const onChainChanged = () => window.location.reload()

    window.ethereum.on('accountsChanged', onAccountsChanged)
    window.ethereum.on('chainChanged', onChainChanged)

    // Auto-reconnect if previously connected (no popup)
    const wasConnected = localStorage.getItem('avaxsignal_wallet_connected')
    window.ethereum
      .request({ method: 'eth_accounts' })
      .then((accounts: string[]) => {
        if (accounts.length > 0 && wasConnected) updateAccount(accounts[0])
      })

    return () => {
      window.ethereum.removeListener('accountsChanged', onAccountsChanged)
      window.ethereum.removeListener('chainChanged', onChainChanged)
    }
  }, [updateAccount])

  // ── Actions ───────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setState(prev => ({
        ...prev,
        error: 'MetaMask not detected. Please install MetaMask first.',
      }))
      return
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }))

    try {
      const accounts: string[] = await window.ethereum.request({
        method: 'eth_requestAccounts',
      })
      localStorage.setItem('avaxsignal_wallet_connected', '1')
      await updateAccount(accounts[0])
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        error: err.code === 4001 ? 'Connection rejected by user.' : (err.message ?? 'Connection failed'),
        isConnecting: false,
      }))
    }
  }, [updateAccount])

  const disconnect = useCallback(() => {
    localStorage.removeItem('avaxsignal_wallet_connected')
    setState({
      account: null, balance: null, chainId: null,
      isConnected: false, isCorrectNetwork: false,
      isConnecting: false, error: null,
    })
  }, [])

  const switchToFuji = useCallback(async () => {
    if (!window.ethereum) return
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: FUJI_CHAIN_HEX }],
      })
    } catch (err: any) {
      // 4902 = chain not added yet → add it
      if (err.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [FUJI_NETWORK_PARAMS],
        })
      }
    }
  }, [])

  /**
   * executeSwap — signs and broadcasts a self-transfer on Fuji testnet.
   *
   * Proves the full execution pipeline on Avalanche without risking
   * real funds. User approves via MetaMask popup.
   */
  const executeSwap = useCallback(async (amountAVAX = '0.01'): Promise<SwapResult> => {
    if (!state.account || !window.ethereum) {
      throw new Error('Wallet not connected')
    }
    if (!state.isCorrectNetwork) {
      throw new Error('Switch to Fuji Testnet (Chain 43113) first')
    }

    // Safety log BEFORE signing (Rules.md requirement)
    console.log(
      `[AvaxSignal] EXECUTING TX: self-transfer of ${amountAVAX} AVAX on Fuji testnet ` +
      `(chain 43113) — TESTNET ONLY, no real funds involved`
    )

    const provider = new BrowserProvider(window.ethereum)
    const signer = await provider.getSigner()

    // Self-transfer proves signing + broadcasting on Avalanche C-Chain
    const tx = await signer.sendTransaction({
      to: state.account,
      value: parseEther(amountAVAX),
    })

    console.log(`[AvaxSignal] TX broadcast: ${tx.hash} — waiting for confirmation...`)
    const receipt = await tx.wait()

    const txHash = receipt!.hash
    console.log(`[AvaxSignal] TX confirmed: ${txHash}`)

    return {
      txHash,
      snowtraceUrl: `https://testnet.snowtrace.io/tx/${txHash}`,
    }
  }, [state.account, state.isCorrectNetwork])

  const refreshBalance = useCallback(async () => {
    if (!state.account) return
    const balance = await fetchBalance(state.account)
    setState(prev => ({ ...prev, balance }))
  }, [state.account, fetchBalance])

  return {
    ...state,
    connect,
    disconnect,
    switchToFuji,
    executeSwap,
    refreshBalance,
  }
}
