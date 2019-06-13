const path = require('path')
const Telegraf = require('telegraf')
const rateLimit = require('telegraf-ratelimit')
const session = require('telegraf/session')
const I18n = require('telegraf-i18n')
const {
  db,
} = require('./database')
const {
  handleStart,
  handleSticker,
  handlePacks,
  handleHidePack,
  handleDeleteSticker,
  handleDonate,
} = require('./handlers')
const {
  sceneNewPack,
} = require('./scanes')


global.startDate = new Date()

// init bot
const bot = new Telegraf(process.env.BOT_TOKEN)

bot.use((ctx, next) => {
  ctx.ms = new Date()
  next()
})


// I18n settings
const { match } = I18n
const i18n = new I18n({
  directory: path.resolve(__dirname, 'locales'),
  defaultLanguage: 'ru',
})

// I18n middleware
bot.use(i18n.middleware())

// rate limit
const limitConfig = {
  window: 300,
  limit: 1,
  onLimitExceeded: (ctx) => ctx.reply(ctx.i18n.t('ratelimit')),
}

bot.use(rateLimit(limitConfig))

// bot config
bot.context.config = require('./config.json')

// get bot username
bot.telegram.getMe().then((botInfo) => {
  bot.options.username = botInfo.username
})

// db connect
bot.context.db = db

// use session
bot.use(session())

// response time logger
bot.use(async (ctx, next) => {
  db.User.updateData(ctx.from)
  await next(ctx)
  const ms = new Date() - ctx.ms

  console.log('Response time %sms', ms)
})

// scene
bot.use(sceneNewPack)

// main commands
bot.hears((['/packs', match('cmd.start.btn.packs')]), handlePacks)
bot.hears((['/new', match('cmd.start.btn.new')]), (ctx) => ctx.scene.enter('newPack'))
bot.hears((['/donate', match('cmd.start.btn.donate')]), handleDonate)
bot.on(['sticker', 'document', 'photo'], handleSticker)

// callback
bot.action(/(set_pack):(.*)/, handlePacks)
bot.action(/(hide_pack):(.*)/, handleHidePack)
bot.action(/(delete_sticker):(.*)/, handleDeleteSticker)

// donate
bot.action(/(donate):(.*)/, handleDonate)
bot.on('pre_checkout_query', ({ answerPreCheckoutQuery }) => answerPreCheckoutQuery(true))
bot.on('successful_payment', handleDonate)

// any message
bot.on('message', handleStart)

// error handling
bot.catch((error) => {
  console.log('Oops', error)
})

// start bot
bot.launch()
console.log('bot start')