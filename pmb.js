require('dotenv').config();
const Discord = require('discord.js');

const client = new Discord.Client({ partials: ["MESSAGE", "CHANNEL", "REACTION" ]});

const prefix = process.env.PREFIX;

const fs = require('fs');

client.commands = new Discord.Collection();

client.once('ready', () => {
    console.log('Private Music Bot | Online')
    client.user.setActivity('pmb!play', { type: 'PLAYING' })
});

const commandFiles = fs.readdirSync('./commands/').filter(file => file.endsWith('.js'));
for(const file of commandFiles){
    const command = require(`./commands/${file}`);

    client.commands.set(command.name, command);
}
client.on('message', (message) => {
    if(!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).split(/ +/);
    const command = args.shift().toLowerCase();

    if(command === 'play'){
        client.commands.get('play').execute(message, args, command, client, Discord);
    } else if (command == 'terminate' && message.author.id === process.env.OWNER_ID){
        client.destroy()
    }
        
});

client.login(process.env.CLIENT_TOKEN); // Client ID