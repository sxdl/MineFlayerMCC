const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals, } = require('mineflayer-pathfinder')
const pvp = require('mineflayer-pvp').plugin
const inventoryViewer = require('mineflayer-web-inventory')
const Vec3 = require('vec3').Vec3;
const readline = require('readline');
let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

const BOT_USERNAME = "LuoLi"
const HOST = "mc.msls1441.com"

var is_login = false

const bot = mineflayer.createBot({
    host: HOST,
    port: 25565,
    username: BOT_USERNAME,
    version: "1.19.2",
    disableChatSigning: true
})

bot.loadPlugin(pathfinder)
bot.loadPlugin(pvp)

inventoryViewer(bot, { startOnLoad: false })

function lookAtNearestEntity() {
    const playerfilter = (entity) => entity.type === 'player'
    const playerEntity = bot.nearestEntity(playerfilter)
    if (!playerEntity) return

    const pos = playerEntity.position.offset(0, playerEntity.height, 0)
    bot.lookAt(pos)
}

function serverChatListener(head, sender, message) {
    console.log('a chat message!')
    console.log('[%s]<%s> %s', head, sender, message)
}

async function playerfollow(sender) {
    const target = bot.players[sender] ? bot.players[sender].entity : null
    if (!target) {
        bot.chat(`/msg ${sender} I don\'t see you !`)
        return
    }

    const mcData = require('minecraft-data')(bot.version)
    const movements = new Movements(bot, mcData)
    bot.pathfinder.setMovements(movements)

    const goal_point = new goals.GoalFollow(target, 2)
    bot.pathfinder.setGoal(goal_point)
}

async function carftIronBlock(sender) {
    // bot.pathfinder.stop()

    const mcData = require('minecraft-data')(bot.version)
    const movements = new Movements(bot, mcData)
    bot.pathfinder.setMovements(movements)


    const craftingTable = bot.findBlock({
        matching: mcData.blocksByName.crafting_table.id,
        maxDistance: 4
    })

    if (!craftingTable) {
        // bot.chat(`/msg ${sender} Cannot find crafting_table.`)
        console.log('Cannot find crafting_table.')
        return
    }
    console.log('Find a Crafting Table')
    // bot.chat(`/msg ${sender} Find a Crafting Table`)
    console.log(craftingTable.position.x)
    console.log(craftingTable.position.y)
    console.log(craftingTable.position.z)

    const p = craftingTable.position

    const goal_point = new goals.GoalBlock(p.x, p.y, p.z)
    bot.pathfinder.setGoal(goal_point)
}

async function craftiron() {
    const mcData = require('minecraft-data')(bot.version)
    console.log('goal_reached')
    // console.log(bot.entity.position.offset(1, 0, 1))
    var chestToOpen = bot.blockAt(bot.entity.position.offset(1, 1, 1))
    var chestToStore = bot.blockAt(bot.entity.position.offset(-1, 0, 0))
    const craftingTable = bot.blockAt(bot.entity.position.offset(0, -1, 0))
    // console.log(chestToOpen)
    while (true) {
        await bot.lookAt(chestToOpen.position)
        const chest = await bot.openChest(chestToOpen)
        console.log(chest.containerItems().length)
        if (chest.containerItems().length <= 9) {
            chest.close()
            console.log('finished crafting')
            return
        }

        for (i = 0; i < 9; i++) {
            await chest.withdraw(728, null, 64)
        }
        console.log('取出9组物品')
        chest.close()
        await craftItem('iron_block', 64)
        console.log('finished crafting 64')
        // await tossItem('iron_block', 0)
        await bot.lookAt(chestToStore.position)
        const storeChest = await bot.openChest(chestToStore)
        await storeChest.deposit(bot.registry.itemsByName['iron_block'].id, null, 64)
        storeChest.close()
        console.log('store 64')
    }
}

async function craftItem(name, amount) {
    amount = parseInt(amount, 10)
    const item = bot.registry.itemsByName[name]
    const craftingTableID = bot.registry.blocksByName.crafting_table.id

    const craftingTable = bot.findBlock({
        matching: craftingTableID
    })

    if (item) {
        const recipe = bot.recipesFor(item.id, null, 1, craftingTable)[0]
        if (recipe) {
            // bot.chat(`I can make ${name}`)
            try {
                await bot.craft(recipe, amount, craftingTable)
                // bot.chat(`did the recipe for ${name} ${amount} times`)
            } catch (err) {
                bot.chat(`error making ${name}`)
            }
        } else {
            // bot.chat(`I cannot make ${name}`)
        }
    } else {
        bot.chat(`unknown item: ${name}`)
    }
}

async function tossItem(name, amount) {
    amount = parseInt(amount, 10)
    const item = itemByName(name)
    if (!item) {
        // bot.chat(`I have no ${name}`)
        console.log(`I have no ${name}`)
    } else {
        try {
            if (amount) {
                await bot.toss(item.type, null, amount)
                //   bot.chat(`tossed ${amount} x ${name}`)
            } else {
                await bot.tossStack(item)
                //   bot.chat(`tossed ${name}`)
            }
        } catch (err) {
            bot.chat(`unable to toss: ${err.message}`)
        }
    }
}

async function clearInvenrory() {
    return
}

function killer() {
    const filter = e => e.type === 'player' && e.position.distanceTo(bot.entity.position) < 16
    const entity = bot.nearestEntity(filter)
    if (entity) {
        // Start attacking
        bot.pvp.attack(entity)
    }
}

function attackPlayer(username) {
    const player = bot.players[username]
    if (!player || !player.entity) {
        bot.chat('I can\'t see you')
    } else {
        //   bot.chat(`Attacking ${player.username}`)
        bot.pvp.attack(player.entity)
    }
}

function attackEntity(username) {
    const filter = e => (e.type === "mob" || (e.type === "player" && e.username != username)) && e.position.distanceTo(bot.entity.position) < 16
    const entity = bot.nearestEntity(filter)
    if (!entity) {
        //   bot.chat('No nearby entities')
    } else {
        //   bot.chat(`Attacking ${entity.name ?? entity.username}`)
        bot.pvp.attack(entity)
    }
}

async function goToSleep() {
    const bed = bot.findBlock({
        matching: block => bot.isABed(block)
    })
    if (bed) {
        try {
            await bot.sleep(bed)
            // bot.chat("I'm sleeping")
            bot.wake()
        } catch (err) {
            bot.chat(`I can't sleep: ${err.message}`)
        }
    } else {
        bot.chat('No nearby bed')
    }
}

async function periodUse(time) {
    // await bot.look(90, -55)
    // const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))
    targetBlock = bot.blockAt(bot.entity.position.offset(-1, 2, 0))
    while (time > 0) {
        try {
            await bot.placeBlock(targetBlock, new Vec3(1, 0, 0))
        }
        catch {
            continue
        }
        // sleep(2000)
        time -= 1
    }
}

async function kkd(epoch){
    console.log("[Auto Cocoa] start producing cocoa. Total epoches:",epoch)
    while(epoch--){
        await periodUse(864)
        console.log("[Auto Cocoa] 1 epoch finished. Left:",epoch)
    }
    console.log("[Auto Cocoa] Task Complete.")
}

function systemMsgLisener(message, position, jsonMessage) {
    if (position == "system") {
        // console.log(position)
        console.log(message)
        // console.log(jsonMessage)
        if (!message.search(/\[(.+) -> 我\] (.+)/)) {
            sender = message.substring(1, message.search('-') - 1)
            message = message.substring(message.search(']') + 2)
            console.log(sender)
            console.log(message)
            if (sender === "LuoQiuQiu") { // || sender === "0xinert"
                switch (true) {
                    case /CraftIronBlock/.test(message): {
                        carftIronBlock(sender)
                        console.log('continue...')
                        break
                    }
                    case /come here/.test(message): {
                        playerfollow(sender)
                        break
                    }
                    case /tphere/.test(message): {
                        bot.chat(`/tpa ${sender}`)
                        break
                    }
                    case /stop move/.test(message): {
                        bot.pathfinder.stop()
                        break
                    }
                    case /start/.test(message): {
                        craftiron()
                        break
                    }
                    case /looker on/.test(message): {
                        bot.on('physicTick', lookAtNearestEntity)
                        break
                    }
                    case /looker off/.test(message): {
                        bot.removeListener('physicTick', lookAtNearestEntity)
                        break
                    }
                    case /drop all items/.test(message): {
                        clearInvenrory()
                        break
                    }
                    case /toss/.test(message): {
                        msg = message.split(' ')
                        console.log(msg)
                        tossItem(msg[1], msg[2])
                        break
                    }
                    case /\//.test(message): {
                        bot.chat(message)
                        break
                    }
                    case /eat/.test(message): {
                        bot.activateItem(true)
                        break
                    }
                    case /autoeat on/.test(message): {
                        bot.on('physicTick', autoEat)
                        break
                    }
                    case /autoeat off/.test(message): {
                        bot.removeListener('physicTick', autoEat)
                        break
                    }
                    case /attack off/.test(message): {
                        bot.pvp.stop()
                        break
                    }
                    case /attack on/.test(message): {
                        attackEntity(sender)
                        break
                    }
                    case /sleep/.test(message): {
                        goToSleep()
                        break
                    }
                    case /slot/.test(message): {
                        // bot.putAway(message.split(' ')[1])
                        var item = bot.inventory.slots[message.split(' ')[1]]
                        console.log(item)
                        bot.equip(item, message.split(' ')[2])
                        break
                    }
                    case /unequip/.test(message): {
                        bot.unequip(message.split(' ')[1])
                        break
                    }
                    case /show inv/.test(message): {
                        bot.webInventory.start()
                        break
                    }
                    case /close inv/.test(message): {
                        bot.webInventory.stop()
                        break
                    }
                    case /click/.test(message): {
                        var slot = parseInt(message.split(' ')[1])
                        bot.clickWindow(slot, 0, 0)
                        break
                    }
                    case /close window/.test(message): {
                        bot.closeWindow(bot.currentWindow)
                        break
                    }
                    case /period use/.test(message): {
                        periodUse(parseInt(message.split(' ')[2]))
                        break
                    }
                    default: {
                        bot.chat(`/msg ${sender} ${message}`)
                        break
                    }
                }
            }

            switch (true) {
                case /say/.test(message): {
                    if (!/\//.test(message))
                        bot.chat(message.substring(4))
                    break
                }
                case /pvp on/.test(message): {
                    // bot.on('physicTick', pvpmode)
                    attackPlayer(sender)
                    break
                }
                case /pvp off/.test(message): {
                    bot.pvp.stop()
                    // bot.removeListener('physicTick', pvpmode)
                    break
                }
                case /killer on/.test(message): {
                    bot.on('physicTick', killer)
                    break
                }
                case /killer off/.test(message): {
                    bot.pvp.stop()
                    bot.removeListener('physicTick', killer)
                    break
                }
                default: {
                    bot.chat(`/msg ${sender} gulugulu~`)
                    break
                }
            }
        }
    }
    else if (position == "chat") {
        // console.log(jsonMessage)
        // console.log('[chat message]')
        var a = 0
    }
}

function itemByName(name) {
    const items = bot.inventory.items()
    if (bot.registry.isNewerOrEqualTo('1.9') && bot.inventory.slots[45]) items.push(bot.inventory.slots[45])
    return items.filter(item => item.name === name)[0]
}

async function autoEat() {
    if (bot.food < 18) {
        bot.activateItem(true)
        console.log('[Console] Bot eat food.')
    }
}

function loginListener(message, position, jsonMessage) {
    if (position == "system") {
        console.log(position)
        console.log(message)
        console.log(jsonMessage)
        if (!is_login)
            while (!(message.match("已成功登录") || message.match("欢迎回来"))) {
                // if("已成功登录" in message) break
                if (message.match("<密码>")) {
                    bot.chat('/login Zzc235711')
                    console.log('[Console]: login')
                    break
                }
                if (is_login) break
            }
        is_login = true
        // bot.on('physicTick', lookAtNearestEntity)
        setTimeout(() => {
            bot.chat('/server 生存服')
        }, 2000)
        console.log('[Console]: to server')

        bot.on('messagestr', systemMsgLisener)
        // bot.on('chat:serverChat', serverChatListener)
        // bot.on('physicTick', autoEat)

        bot.off('messagestr', loginListener)
        // bot.off('spawn', spawnListener)
    }
}

function spawnListener() {
    bot.on('messagestr', loginListener)
    bot.addChatPattern('serverChat', /\[玩家\]\[主世界\]<LuoQiuQiu> 1/)  // /^\[(.+) -> (.+)\] (.+)/
    bot.on('kicked', (msg, bl) => { console.log(msg) })
}


bot.once('spawn', spawnListener)

rl.on('line', function (line) {
    line.trim()
    //inputs.push(line.trim()) //trim去除两边的空格
    console.log(line);
    switch (true) {
        case /period use/.test(line): {
            kkd(line.split(' ')[2])
            break;
        }
        case /quit/.test(line): {
            bot.quit()
            break;
        }
        default:{
            console.log("[Console] err unknown command.")
            break;
        }
    }
})
