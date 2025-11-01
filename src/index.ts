import { Context, Schema } from 'koishi'

export const name = 'money'

export interface Config {}

export const Config: Schema<Config> = Schema.object({})

// 声明插件需要注入的服务
export const inject = ['database']

declare module 'koishi' {
  interface Tables {
    money: Money
  }
  
  interface Context {
    money: MoneyAPI
  }
}

export interface Money {
  userId: string
  channelId: string
  currencyName: string
  amount: number
}

// 添加API接口定义
export interface MoneyAPI {
  add: (userId: string, channelId: string, currencyName: string, amount: number) => Promise<boolean>
  reduce: (userId: string, channelId: string, currencyName: string, amount: number) => Promise<boolean | number>
  get: (userId: string, channelId: string, currencyName: string) => Promise<number | undefined>
}

export function apply(ctx: Context) {
  // 定义数据库表
  ctx.model.extend('money', {
    userId: 'string',
    channelId: 'string',
    currencyName: 'string',
    amount: 'integer',
  }, {
    primary: ['userId', 'channelId', 'currencyName'],
  })
  
  // 注册API
  ctx.money = {
    add: async (userId: string, channelId: string, currencyName: string, amount: number) => {
      try {
        let [moneyRecord] = await ctx.database.get('money', { userId, channelId, currencyName })
        
        if (!moneyRecord) {
          // 如果记录不存在，创建新记录
          await ctx.database.create('money', { userId, channelId, currencyName, amount })
        } else {
          // 如果记录存在，更新金额
          await ctx.database.set('money', { userId, channelId, currencyName }, {
            amount: moneyRecord.amount + amount
          })
        }
        return true
      } catch (error) {
        ctx.logger.error('增加货币时出错:', error)
        return false
      }
    },
    
    reduce: async (userId: string, channelId: string, currencyName: string, amount: number) => {
      try {
        let [moneyRecord] = await ctx.database.get('money', { userId, channelId, currencyName })
        
        if (!moneyRecord) {
          return false // 用户没有该货币记录
        }
        
        const newAmount = moneyRecord.amount - amount
        if (newAmount < 0) {
          return moneyRecord.amount // 返回当前余额表示不足
        }
        
        // 更新金额
        await ctx.database.set('money', { userId, channelId, currencyName }, {
          amount: newAmount
        })
        
        return newAmount
      } catch (error) {
        ctx.logger.error('减少货币时出错:', error)
        return false
      }
    },
    
    get: async (userId: string, channelId: string, currencyName: string) => {
      try {
        const [moneyRecord] = await ctx.database.get('money', { userId, channelId, currencyName })
        return moneyRecord ? moneyRecord.amount : undefined
      } catch (error) {
        ctx.logger.error('查询货币时出错:', error)
        return undefined
      }
    }
  }
  
  // 查询货币命令
  ctx.command('money', '查询货币')
    .action(async ({ session }) => {
      if (!session) return '无法获取会话信息'
      
      const moneyRecords = await ctx.database.get('money', {
        userId: session.userId,
        channelId: session.channelId
      })
      
      if (moneyRecords.length === 0) {
        return '您在此群聊中还没有任何货币记录'
      }
      
      let result = '您的货币信息：\n'
      for (const record of moneyRecords) {
        result += `${record.currencyName}: ${record.amount}\n`
      }
      
      return result.trim()
    })
    
  // 增加货币命令
  ctx.command('money.add <currency> <amount:number>', '增加货币')
    .option('target', '-t [target]', { authority: 2 }) // 只有管理员可以指定其他用户
    .action(async ({ session, options }, currency, amount) => {
      if (!session) return '无法获取会话信息'
      if (!currency || amount === undefined) return '请输入货币名称和数量'
      
      try {
        // 检查是否是管理员操作其他用户
        const targetUserId = options.target ? options.target as string : session.userId
        
        const success = await ctx.money.add(targetUserId, session.channelId, currency, amount)
        if (success) {
          return `成功为用户${options.target ? targetUserId : '您'}增加${amount}${currency}`
        } else {
          return '操作失败，请稍后重试'
        }
      } catch (error) {
        ctx.logger.error('增加货币时出错:', error)
        return '操作失败，请稍后重试'
      }
    })
    
  // 减少货币命令
  ctx.command('money.reduce <currency> <amount:number>', '减少货币')
    .option('target', '-t [target]', { authority: 2 }) // 只有管理员可以指定其他用户
    .action(async ({ session, options }, currency, amount) => {
      if (!session) return '无法获取会话信息'
      if (!currency || amount === undefined) return '请输入货币名称和数量'
      
      try {
        // 检查是否是管理员操作其他用户
        const targetUserId = options.target ? options.target as string : session.userId
        
        const result = await ctx.money.reduce(targetUserId, session.channelId, currency, amount)
        if (result === false) {
          return `用户没有${currency}货币记录`
        } else if (typeof result === 'number' && result < amount) {
          return `用户${currency}货币不足`
        } else if (typeof result === 'number') {
          return `成功为用户${options.target ? targetUserId : '您'}减少${amount}${currency}，当前余额：${result}`
        } else {
          return '操作失败，请稍后重试'
        }
      } catch (error) {
        ctx.logger.error('减少货币时出错:', error)
        return '操作失败，请稍后重试'
      }
    })
    
  // 重置数据表命令
  ctx.command('money.reset', '重置货币数据表')
    .option('confirm', '-c') // 确认参数
    .action(async ({ session, options }) => {
      if (!session) return '无法获取会话信息'
      
      // 检查权限，只允许管理员执行此操作
      if (session.user?.['authority'] !== 2) {
        return '权限不足，只有管理员可以重置数据表'
      }
      
      // 如果没有确认参数，提示用户确认
      if (!options.confirm) {
        return '此操作将删除所有货币数据且不可恢复，如确定执行请添加 -c 参数'
      }
      
      // 删除所有数据
      await ctx.database.remove('money', {})
      
      return '货币数据表已重置，所有数据已被清除'
    })
}