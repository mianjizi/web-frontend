// 本机 Node 环境探针 —— 数据出处：Web前端/06-专项 JavaScript脚本实战.md 的「本机实测」表
// 跑法：node node_probe.mjs          只跑本地能力检查（不联网）
//       node node_probe.mjs --net    额外做一次联网检查（默认 UA 与自定义 UA 回显）
// 首次实测环境：Windows 11 + Node v26.7.0（2026-10-01）

const onlyNet = process.argv.includes('--net')
const { parseArgs } = await import('node:util')

const row = (k, v) => console.log(`  ${String(k).padEnd(26)} ${v}`)

if (!onlyNet) {
  console.log(`Node ${process.version}   ${process.platform}/${process.arch}`)
  console.log(`脚本所在目录（import.meta.dirname）: ${import.meta.dirname}`)
  console.log(`当前工作目录（process.cwd）:        ${process.cwd()}`)
  console.log('')
  console.log('能力检查（本机实测；写笔记前先跑这个，不要凭印象写版本号）：')

  row('globalThis.fetch', typeof fetch)
  row('AbortController', typeof AbortController)
  row('AbortSignal.timeout', typeof AbortSignal.timeout)
  row('structuredClone', typeof structuredClone)
  row('Object.groupBy', typeof Object.groupBy)
  row('Promise.withResolvers', typeof Promise.withResolvers)
  row('Array.prototype.toSorted', typeof [].toSorted)
  row('URL.parse', typeof URL.parse)
  row('import.meta.dirname', import.meta.dirname ? '有' : '无')
  row('node:util parseArgs', typeof parseArgs)
  row('import.meta.resolve', typeof import.meta.resolve)

  console.log('')
  console.log('parseArgs 试解析 --dir abc --loud：')
  const parsed = parseArgs({
    args: ['--dir', 'abc', '--loud'],
    options: { dir: { type: 'string' }, loud: { type: 'boolean' } },
  })
  row('values', JSON.stringify(parsed.values))
  row('positionals', JSON.stringify(parsed.positionals))

  console.log('')
  console.log('process.argv 形态（本进程）：')
  row('[0] 解释器', process.argv[0])
  row('[1] 脚本', process.argv[1])
  row('slice(2) 真实参数', JSON.stringify(process.argv.slice(2)))

  console.log('')
  console.log('注意：.ts 能否直接跑，只能在外面测（本脚本自身是 .mjs）——')
  console.log('  造一个 t.ts 写成「const n: number = 41; console.log(n + 1)」再执行 node t.ts 看结果。')
}

if (process.argv.includes('--net')) {
  const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.8037.59 Safari/537.36'
  console.log('')
  console.log('联网检查（两次请求的对照，看服务端实际收到什么）：')
  row('Request 对象上读 user-agent', `${new Request('https://example.com').headers.get('user-agent')}  ← UA 在发送时才由运行时加上，不是在这里`)

  try {
    const plain = await fetch('https://httpbin.org/headers', { signal: AbortSignal.timeout(20_000) })
    if (!plain.ok) throw new Error(`HTTP ${plain.status}`)
    row('服务端看到的 UA（不设任何头）', (await plain.json()).headers['User-Agent'])
  } catch (err) {
    row('默认 UA 检查失败', `${err.name}: ${err.message}（不影响本地结论）`)
  }

  await new Promise((r) => setTimeout(r, 1000 + Math.random() * 2000))

  try {
    const echo = await fetch('https://httpbin.org/headers', {
      headers: { 'user-agent': UA, 'accept-language': 'zh-CN,zh;q=0.9' },
      signal: AbortSignal.timeout(20_000),
    })
    if (!echo.ok) throw new Error(`HTTP ${echo.status}`)
    const seen = (await echo.json()).headers['User-Agent']
    row('服务端看到的 UA（自定义）', seen)
    row('自定义 UA 是否生效', seen === UA ? '生效' : '未生效')
  } catch (err) {
    row('联网检查失败', `${err.name}: ${err.message}（不影响本地结论）`)
  }
}
