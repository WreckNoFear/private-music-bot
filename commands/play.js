const ytdl = require('ytdl-core');
const ytSearch = require('yt-search');

const queue = new Map(); // Global queue
// queue(message.guild.id, queue_constructor_obeject {voice channel, text channel, connection, song[]});
module.exports = {
    name: 'play',
    aliases: ['skip', 'stop'],
    cooldown: 0,
    description: 'Music',
    async execute(message, args, command, client, Discord){
        const voice_channel = message.member.voice.channel; // Get voice channel user is in
        if (!voice_channel) return message.channel.send('You must be in a voice channel to run this command!');
        const permissions = voice_channel.permissionsFor(message.client.user); // Get permissions of user
        if (!permissions.has('CONNECT')) return message.channel.send('You don\'t have the correct permission'); // Check if user has permission to connect to voice channel
        if (!permissions.has('SPEAK')) return message.channel.send('You don\'t have the correct permission'); // Check if user has permission to speak in voice channel

        const server_queue = queue.get(message.guild.id); // Get queue for server where song is going to be played

        if (command === 'play'){
            if (!args.length) return message.channel.send('This command requires a second argument!');
            let song = {};

            if (ytdl.validateURL(args[0])) { // If video is a url
                const song_info = await ytdl.getInfo(args[0]);
                song = { title: song_info.videoDetails.title, url: song_info.videoDetails.video_url }
            } else {
                const video_finder = async (query) => {
                    const videoResult = await ytSearch(query);
                    return (videoResult.videos.length > 1) ? videoResult.videos[0] : null; // Play very first video
                }

                const video = await video_finder(args.join(' ')); // Getting all arguments, joining them, then passing them into the query ^ that searches for the video
                if (video) { // If video was found
                    song = { title: video.title, url: video.url }
                } else {
                    message.channel.send('Error finding video.');
                }
            }

            if (!server_queue) {

                const queue_constructor = {
                    voice_channel: voice_channel, // Voice channel user is in
                    text_channel: message.channel, // Text channel where message was sent
                    connection: null,
                    songs: [] // When a song is added to queue, it is put here
                }
                
                queue.set(message.guild.id, queue_constructor);
                queue_constructor.songs.push(song); // Put any requested songs in song list above ^
    
                try {
                    const connection = await voice_channel.join(); // Wait for bot to join voice channel
                    queue_constructor.connection = connection;
                    video_player(message.guild, queue_constructor.songs[0]);
                } catch (err) {
                    queue.delete(message.guild.id);
                    message.channel.send('An error occured whilst connecting.');
                    throw err;
                }
            } else {
                server_queue.songs.push(song); // If there is already a server queue, just push current song
                return message.channel.send(`**${song.title}** added to the queue!`);
            }
        }
    }
}

const video_player = async (guild, song) => {
    const song_queue = queue.get(guild.id);

    if (!song) { // If there is no song
        song_queue.voice_channel.leave();
        queue.delete(guild.id);
        return;
    }
    const stream = ytdl(song.url, { filter: 'audoonly' }); // Audio of video only
    song_queue.connection.play(stream, { seek: 0, volume: 0.5 })
    .on('finish', () => {
        song_queue.songs.shift() // Once song has finished playing, move to the next one in the queue
        video_player(guild, song_queue.songs[0]);
    });
    await song_queue.text_channel.send(`Now playing **${song.title}**`)
}