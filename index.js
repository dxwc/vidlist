#! /usr/bin/env node

const fs        = require('fs');
const path      = require('path');
const https     = require('https');

const opn       = require('opn');
const moment    = require('moment');
const sqlite3   = require('sqlite3');
const entities  = require('entities');
const validator = require('validator');
const Getopt    = require('node-getopt');
const xss       = require('xss-filters');

global.old_video_limit_sec = 15*24*60*60; // 15 days

global.dot = path.join(require('os').homedir(), '.vidlist');
global.html = path.join(require('os').tmpdir() , 'view_subscriptions.html');

try
{
    if(!fs.statSync(global.dot).isDirectory())
    {
        console.error(`=> Error:\nCan not create a directory as there is an \
existing file with the same name ( ${global.dot} ). \
Remove/rename the file and then re-run to continue`);
        process.exit(1);
    }
}
catch(err)
{
    if(err.code === 'ENOENT')
    {
        try
        {
            fs.mkdirSync(global.dot);
        }
        catch(err)
        {
            console.error(`=> Error creating directory ${global.dot}`);
            console.error(err);
            throw err;
        }
    }
    else
    {
        console.error('=> Unhandled Error\n', err);
        throw err;
    }
}

/**
 * Asynchronously downloads content given https link
 * @param {String} link Full https youtube url
 * @returns {Promise} Resolved parameter is the downloaded content
 */
function download_page(link)
{
    return new Promise((resolve, reject) =>
    {
        let data = '';
        https.get
        (
            link,
            (res) =>
            {
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => resolve(data));
                res.on('error', (err) => reject(err));
            }
        )
        .on('error', (err) => reject(err));
    });
}

/**
 * Regex check to see is valid watch, channel, user or a shortend yt url
 * @param {String} url Full https youtube url
 * @returns {Boolean}
 */
function is_valid_yt_url(url)
{
    try
    {
        if
        (
            url.match(/https:\/\/www.youtube.com\/watch\?v=.+/) !== null ||
            url.match(/https:\/\/www.youtube.com\/channel\/.+/) !== null ||
            url.match(/https:\/\/www.youtube.com\/user\/.+/)    !== null ||
            url.match(/https:\/\/youtu.be\/...........+/)       !== null
        )
        {
            return true;
        }
    }
    catch(err)
    {
        console.error('Error', err);
    }

    return false;
}

/**
 * Find and validate data-channel-external-id
 * @param {String} html_page Content of the downloaded page
 * @returns {(String|Null)} ID or null
 */
function parse_channel_id(html_page)
{
    let id_string_found = html_page.search('data-channel-external-id=\"');

    if(id_string_found !== -1)
    {
        let ch_id = html_page.substring(id_string_found+26, id_string_found+26+24);
        if
        (
            !validator.isWhitelisted
            (
                ch_id.toLowerCase(),
                'abcdefghijklmnopqrstuvwxyz0123456789-_'
            )
        )
        {
            console.error('Extracted channel id contains invalid charactes.');
            return null;
        }
        else
        {
            return ch_id;
        }
    }
    else
    {
        return null;
    }
}

/**
 * Use a channle ID to download content of a channel page to extract channel name
 * @param {String} channel_id A valid youtube channel ID
 * @returns {Promise<String>} Resolve with channel name, reject with error info
 */
function parse_channel_name(channel_id)
{
    return new Promise((resolve, reject) =>
    {
        if(typeof(channel_id) != 'string' || channel_id.length != 24)
        {
            reject('Invalid youtube channel ID');
        }

        download_page('https://www.youtube.com/channel/'+channel_id)
        .then((page) =>
        {
            let id_string_found_pre = page.search('<title>  ');
            let id_string_found_post = page.search('</title>');

            if(
                id_string_found_pre !== -1 &&
                id_string_found_post !== -1 &&
                id_string_found_pre + 11 < id_string_found_post)
            {
                resolve
                (
                    page.substring
                    (
                        id_string_found_pre+9,
                        id_string_found_post-11
                    )
                );
            }
            else
            {
                reject('Parseable string not found in page')
            }
        });
    });
}

/**
 * Run a sql command to sqlite3
 * @param {String} command SQL command
 * @returns {Promise}
 */
function sql_promise(command)
{
    return new Promise((resolve, reject) =>
    {
        db.run
        (
            command,
            (result, err) =>
            {
                if(result && result.errno) reject(result);
                else if(err) reject(err);
                else resolve();
            }
        );
    });
}

/**
 * Open database for use, create tables and indexes if opening for the first time
 * @returns {Promise}
*/
function open_db_global()
{
    return new Promise((resolve, reject) =>
    {
        global.db = new sqlite3.Database
        (
            path.join(global.dot, 'subscription_data.db'),
            (err) =>
            {
                if(err) reject(err);
                sql_promise
                (
                    `
                    CREATE TABLE IF NOT EXISTS subscriptions
                    (
                        channel_id_id INTEGER PRIMARY KEY AUTOINCREMENT,
                        channel_id    TEXT UNIQUE NOT NULL,
                        channel_name  TEXT
                    );
                    `
                )
                .then(() =>
                {
                    return sql_promise
                    (
                        `
                        CREATE TABLE IF NOT EXISTS videos
                        (
                            channel_id_id     INTEGER REFERENCES
                                              subscriptions(channel_id_id),
                            video_id          TEXT PRIMARY KEY,
                            video_title       TEXT,
                            video_published   INTEGER,
                            video_description TEXT
                        );
                        `
                    );
                })
                .then(() =>
                {
                    return sql_promise
                    (
                        `
                        CREATE INDEX IF NOT EXISTS video_published_i
                        ON videos(video_published DESC);
                        `
                    );
                })
                .then(() =>
                {
                    return sql_promise
                    (
                        `
                        CREATE UNIQUE INDEX IF NOT EXISTS channel_id_i
                        ON subscriptions(channel_id);
                        `
                    );
                })
                .then(() =>
                {
                    resolve();
                })
                .catch((err) =>
                {
                    reject(err);
                })
            }
        );
    });
}

/**
 * Used by subscribe() to insert an subscription
 * @param {String} ch_id Channel ID
 * @param {String} ch_name Channel name
 * @returns {Promise}
 */
function insert_for_subscribe(ch_id, ch_name)
{
    return new Promise((resolve, reject) =>
    {
        db.run
        (
            `
            INSERT INTO subscriptions
                (channel_id, channel_name)
            VALUES
                ('${ch_id}', '${ch_name}');
            `,
            (result) =>
            {
                if(global.is_import === undefined)
                process.stdout.write('                                     \r');
                if(result && result.errno)
                {
                    if(result.errno == 19)
                        console.info(
                            `You were already subscribed to '${entities.decodeHTML
                                (validator.unescape
                                    (ch_name))}' (${ch_id})`);
                    else
                    {
                        reject(result);
                    }
                }
                else if(result === null)
                {
                    console.info(`Subscribed to '${entities.decodeHTML
                        (validator.unescape
                            (ch_name))}' (${ch_id})`);
                    resolve();
                }
                else
                {
                    reject('Undefined error');
                }
            }
        );
    });
}

/**
 * Verify url, download content, parse channel ID and name and then insert an entry
 * to subscriptions table of sqlite3 db
 * @param {String} youtube_url A acceptable youtube url
 */
function subscribe(youtube_url)
{
    if(typeof(youtube_url) !== 'string' || !is_valid_yt_url(youtube_url))
        return console.error('Not a valid youtube URL');
    else if(typeof(db) === undefined)
        return console.error(`Database has not been opened`);

    let ch_id = undefined;
    let ch_name = undefined;

    return Promise.resolve()
    .then(() =>
    {
        if(global.is_import === undefined)
            process.stdout.write(': Fetching a page to extract data...\r');
        return download_page(youtube_url);
    })
    .then((page) =>
    {
        if(global.is_import === undefined)
        {
            process.stdout.write('                                      \r');
            process.stdout.write(': Extracting information...\r');
        }
        ch_id = parse_channel_id(page);
        return parse_channel_name(ch_id);
    })
    .then((name) =>
    {
        if(global.is_import === undefined)
        {
            process.stdout.write('                                      \r');
            process.stdout.write(': Saving extracted data to database...\r');
        }
        ch_name = validator.escape(name);
        return insert_for_subscribe(ch_id, ch_name);
    })
    .catch((err) =>
    {
        console.error('Error:\n', err);
    });
}

/**
 * Deletes video entries from videos db whose publish date are older than the limit
 * set by global.old_video_limit_sec variable
 * @returns {Promise}
*/
function keep_db_shorter()
{
    return new Promise((resolve, reject) =>
    {
        db.run
        (
            `
            DELETE
                FROM videos
            WHERE
                video_published < ${
                    (new Date().getTime()/1000) - global.old_video_limit_sec}`,
            (err) =>
            {
                if(err) reject(err);
                else resolve();
            }
        );
    });
}

/**
 * Prints subscriptions list to stdout
 * @param {Boolean} names_only To display only channel names
 */
function list_subscriptions(names_only)
{
    return new Promise((resolve, reject) =>
    {
        db.all
        (
            `
            SELECT * FROM subscriptions
            `,
            (err, rows) =>
            {
                if(err) reject(err);
                if(names_only)
                {

                    for(let i = 0; i < rows.length; ++i)
                    {
                        console.info
                        (
                            String(rows[i].channel_id_id) + '.',
                            entities.decodeHTML
                            (
                                validator.unescape(rows[i].channel_name)
                            )
                        );
                    }
                }
                else
                {
                    for(let i = 0; i < rows.length; ++i)
                    {
                        console.info
                        (
                            rows[i].channel_id,
                            entities.decodeHTML
                            (
                                validator.unescape(rows[i].channel_name)
                            )
                        );
                    }
                }
                resolve();
            }
        );
    });
}

/**
 * Insert entries into videos table in sqlite3 db
 * @param {String} values String must be formatted as sql values data
 */
function insert_entries(values)
{
    return new Promise((resolve, reject) =>
    {
        if(values.length === 0) return resolve();

        db.run
        (
            `
            INSERT OR REPLACE INTO videos
            (
                channel_id_id,
                video_id,
                video_title,
                video_published,
                video_description
            )
            VALUES
            ${values}
            `,
            (result, err) =>
            {
                if
                (
                    result && typeof(result.errno) === 'number' &&
                    result.errno !== 19
                )
                {
                    return reject(result);
                }
                else
                {
                    return resolve();
                }
            }
        );
    });
}

/**
 * Extract and gather video id, title, published and description information
 * @param {String} page Downloaded rss content of a youtube channel
 * @param {String} ch_id_id Associated db PK id
 * @returns {Promise} Resolve indicates both parsing and saving data has been
 * completed
 */
function parse_and_save_data(page, ch_id_id)
{
    let v_id_pre = -1;
    let v_id_post = -1;
    let v_title_pre = -1;
    let v_title_post = -1;
    let v_published_pre = -1;
    let v_published_post = -1;
    let v_description_pre = -1;
    let v_description_post = -1;

    let a_id;
    let a_title;
    let a_pubDate;
    let a_description;

    let values = '';

    return new Promise((resolve, reject) =>
    {
        while(page.indexOf('<entry>') !== -1)
        {
            page = page.substring(page.indexOf('<entry>')-1);

            v_id_pre = page.indexOf('<yt:videoId>');
            v_id_post = page.indexOf('</yt:videoId>');
            v_title_pre = page.indexOf('<title>');
            v_title_post = page.indexOf('</title>');
            v_published_pre = page.indexOf('<published>');
            v_published_post = page.indexOf('</published>');
            v_description_pre = page.indexOf('<media:description>');
            v_description_post = page.indexOf('</media:description>');

            if
            (
                v_id_pre           === -1 ||
                v_id_post          === -1 ||
                v_title_pre        === -1 ||
                v_title_post       === -1 ||
                v_published_pre    === -1 ||
                v_published_post   === -1 ||
                v_description_pre  === -1 ||
                v_description_post === -1
            )
            {
                reject('tagname/s under entry not found');
                break;
            }

            a_title = page.substring(v_title_pre+7, v_title_post);
            a_id = page.substring(v_id_pre+12, v_id_post);
            a_pubDate = new Date
                        (
                            page.substring(v_published_pre+11, v_published_post)
                        ).getTime()/1000;
            a_description = page.substring(v_description_pre+19, v_description_post);

            a_title = validator.escape(a_title);

            if(!validator.whitelist(
                a_id.toLowerCase(), 'abcdefghijklmnopqrstuvwxyz1234567890_-'))
            {
                return reject('Extracted id is not of the expected form');
                break;
            }

            a_description = validator.escape(a_description);

            if(page.indexOf('</entry>') == -1)
            {
                return reject('</entry> not found');
                break;
            }

            page = page.substring(page.indexOf('</entry>'));

            if(a_pubDate >= (new Date().getTime()/1000) - global.old_video_limit_sec)
            {
                values += `${values.length ? ',' : ''}
(${ch_id_id}, '${a_id}', '${a_title}', ${a_pubDate}, '${a_description}')`;
            }
        }

        return insert_entries(values)
        .then(() =>
        {
            return resolve();
        });
    });
}

/** Used by process_one(...) to display prcessing progress */
global.remaining = 0;

/**
 * Downloads content of a channel's rss feed and pass data to parse_and_save_data(...)
 * @param {Number} channel_id_id The database PK from db of the channel to process
 * @param {String} channel_id The channel ID
 */
function process_one(channel_id_id, channel_id)
{
    return Promise.resolve()
    .then(() =>
    {
        if(global.prog)
            process.stdout.write
            (`: ${global.remaining} channel's download and processing remaining\r`);
        return true;
    })
    .then(() =>
    {
        return download_page
        (
            `https://www.youtube.com/feeds/videos.xml?channel_id=${channel_id}`
        );
    })
    .then((page) =>
    {
        return parse_and_save_data(page, channel_id_id);
    })
    .then(() =>
    {
        global.remaining -= 1;
    });
}

/**
 * Upadate videos data by parsing and processing all channel's rss feed
 * @returns {Promise} A promise chain representing all processing for update
*/
function download_and_save_feed()
{
    return new Promise((resolve, reject) =>
    {
        db.all
        (
            `SELECT channel_id_id, channel_id FROM subscriptions`,
            (err, rows) =>
            {
                if(err) reject(err);
                else
                {
                    if(global.prog)
                        process.stdout.write('Initiating downloader and processor\r');

                    let all_downloads = Promise.resolve();
                    global.remaining = rows.length;

                    for(let i = 0; i < rows.length; ++i)
                    {
                        if(i + 5 < rows.length)
                        {
                            let k = i;
                            all_downloads = all_downloads
                            .then(() =>
                            {
                                return Promise.all
                                (
                                    [
                        process_one(rows[k+5].channel_id_id, rows[k+3].channel_id),
                        process_one(rows[k+4].channel_id_id, rows[k+3].channel_id),
                        process_one(rows[k+3].channel_id_id, rows[k+3].channel_id),
                        process_one(rows[k+2].channel_id_id, rows[k+2].channel_id),
                        process_one(rows[k+1].channel_id_id, rows[k+1].channel_id),
                        process_one(rows[k].channel_id_id, rows[k].channel_id)
                                    ]
                                );
                            });

                            i += 5;
                        }
                        else if(i + 4 < rows.length)
                        {
                            let k = i;
                            all_downloads = all_downloads
                            .then(() =>
                            {
                                return Promise.all
                                (
                                    [
                        process_one(rows[k+4].channel_id_id, rows[k+3].channel_id),
                        process_one(rows[k+3].channel_id_id, rows[k+3].channel_id),
                        process_one(rows[k+2].channel_id_id, rows[k+2].channel_id),
                        process_one(rows[k+1].channel_id_id, rows[k+1].channel_id),
                        process_one(rows[k].channel_id_id, rows[k].channel_id)
                                    ]
                                );
                            });

                            i += 4;
                        }
                        else if(i + 3 < rows.length)
                        {
                            let k = i;
                            all_downloads = all_downloads
                            .then(() =>
                            {
                                return Promise.all
                                (
                                    [
                        process_one(rows[k+3].channel_id_id, rows[k+3].channel_id),
                        process_one(rows[k+2].channel_id_id, rows[k+2].channel_id),
                        process_one(rows[k+1].channel_id_id, rows[k+1].channel_id),
                        process_one(rows[k].channel_id_id, rows[k].channel_id)
                                    ]
                                );
                            });

                            i += 3;
                        }
                        else if(i + 2 < rows.length)
                        {
                            let k = i;
                            all_downloads = all_downloads
                            .then(() =>
                            {
                                return Promise.all
                                (
                                    [
                        process_one(rows[k+2].channel_id_id, rows[k+2].channel_id),
                        process_one(rows[k+1].channel_id_id, rows[k+1].channel_id),
                        process_one(rows[k].channel_id_id, rows[k].channel_id)
                                    ]
                                );
                            });

                            i += 2;
                        }
                        else if(i + 1 < rows.length)
                        {
                            // by the time i is used bellow, program moved past
                            // this block to the i+=1, having a temp k seems to work
                            // TODO: find out why exactly
                            let k = i;
                            all_downloads = all_downloads
                            .then(() =>
                            {
                                return Promise.all
                                (
                                    [
                            process_one(rows[k].channel_id_id, rows[k].channel_id),
                            process_one(rows[k+1].channel_id_id, rows[k+1].channel_id)
                                    ]
                                );
                            });

                            i += 1;
                        }
                        else
                        {
                            all_downloads = all_downloads
                            .then(() =>
                            {
                    return process_one(rows[i].channel_id_id, rows[i].channel_id);
                            });
                        }
                    }
                    return resolve(all_downloads);
                }
            }
        );
    });
}

/**
 * Upadate videos data by parsing and processing chosen channel's rss feed
 * @returns {Promise} Resolves when update completes
*/
function download_and_save_one_feed(num)
{
    return Promise.resolve()
    .then(() =>
    {
        if(typeof num === 'string' && validator.isInt(num)) return Number(num);
        return list_subscriptions(true)
        .then(() =>
        {
            return new Promise((resolve, reject) =>
            {
                require('readline').createInterface
                ({
                    input: process.stdin,
                    output: process.stdout
                })
                .question('Enter the channel number you wish to update: ', (answer) =>
                {
                    if(validator.isInt(answer)) return resolve(Number(answer));
                    else return reject
                    ('Invalid answer, must be one of the number shown');
                });
            })
        });
    })
    .then((channel_number) =>
    {
        return new Promise((resolve, reject) =>
        {
            db.all
            (
                `
                SELECT
                    channel_id_id,
                    channel_id
                FROM
                    subscriptions
                WHERE
                    channel_id_id=${channel_number}`,
                (err, rows) =>
                {
                    if(err) return reject(err);
                    else
                    {
                        if(global.prog)
                        process.stdout.write('Initiating downloader and processor\r');

                        if(rows.length)
                            process_one(rows[0].channel_id_id, rows[0].channel_id)
                            .then(() =>
                            {
                                return resolve();
                            });
                        else
                        {
                            console.error
                            (
                '=> No channel found associated with given number, SKIPPING',
                channel_number
                            );
                            return resolve();
                        }
                    }
                }
            );
        });
    });
}

/**
 * @returns {Promise} All video data as well as channel id and title
*/
function get_video_data()
{
    return new Promise((resolve, reject) =>
    {
        db.all
        (
            `
            SELECT
                channel_id,
                channel_name,
                video_id,
                video_title,
                video_published,
                video_description
            FROM
            subscriptions
                INNER JOIN
            (SELECT * FROM videos ORDER BY video_published DESC) vi
            ON subscriptions.channel_id_id = vi.channel_id_id
            `,
            (err, rows) =>
            {
                if(err) return reject(err);
                return resolve(rows);
            }
        );
    });
}

/**
 * @returns {Promise} Returns all channel_id and channel_name
*/
function get_channel_data()
{
    return new Promise((resolve, reject) =>
    {
        db.all
        (
            `
            SELECT
                channel_id,
                channel_name
            FROM
                subscriptions
            `,
            (err, rows) =>
            {
                if(err) return reject(err);
                return resolve(rows);
            }
        );
    });
}

/**
 * Generates html
 * @returns {Promise}
*/
function generate_html()
{
    return Promise.all([get_video_data(), get_channel_data()])
    .then((result) =>
    {

        let full =
`<!DOCTYPE html>
<html>
<head>
    <meta charset='UTF-8'>
    <title>Subscriptions</title>
    <style type='text/css'>
	html,
	body {
        margin: 0;
        padding: 0;
        background-color: #F6F9FC;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
	}

	p {
        font-weight: normal;
        color: #6b7c93;
	}

	img {
        width: 100%;
        border-top-right-radius: 1.5%;
        border-top-left-radius: 1.5%;
	}

	a {
        text-decoration: none;
        color: rgb(34, 34, 34);
        font-weight: bold;
	}

	.container {
        width: 100%;
        margin-left: 0;
        float: left;
        display: flex;
        flex-wrap: wrap;
        flex-direction: row;
        align-content: space-between;
        overflow-x: hidden;
        margin-bottom: 2%;
	}

	.card {
        float: left;
        width: 19.25%;
        margin-left: 0.625%;
        margin-right: 0;
        margin-bottom: 0.2em;
        margin-top: 0.2em;
        height: auto;
        background-color: #fff;
        border-radius: 0.5%;
        box-shadow: 0 1px 8px rgba(0, 0, 0, .08);
        -webkit-box-shadow: 0 1px 8px rgba(0, 0, 0, .08);
        -moz-box-shadow: 0 1px 8px rgba(0, 0, 0, .08);
        overflow: hidden;
        text-overflow: ellipse;
	}

	.card:hover {
        box-shadow: 2px 2px 9px rgba(0, 0, 0, .1);
        -webkit-box-shadow: 2px 2px 9px rgba(0, 0, 0, .1);
        -moz-box-shadow: 2px 2px 9px rgba(0, 0, 0, .1);
	}

	.card p,
	h1,
	h2,
	h3,
	h4,
	h5,
	h6 {
        margin: 0;
        margin-left: 2%;
        margin-right: 2%;
    }

    h4 {
        padding-bottom: 0.15em;
    }

    .card p {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
    }
	.channels {
        width: 100%;
        overflow: hidden;
        text-overflow: ellipse;
	}

    ul {
        -moz-column-count: 4;
        -moz-column-gap: 1%;
        -webkit-column-count: 4;
        -webkit-column-gap: 1%;
        column-count: 4;
        column-gap: 1%;
        list-style-type: none;
        margin: 0;
        padding: 0;
    },
	li {
        padding: 0;
	}

	li a {
        width: 85%;
        margin: 0 auto;
        display: block;
        padding: 1% 0%;
        padding-left: 3%;
	}

	li a:hover {
        color: #fff;
        background-color: rgb(34, 34, 34);
	}
  </style>
</head>
<body>
`;

			full += `<div class='container'>`
			for (let i = 0; i < result[0].length; ++i) {
				full += `
    <div class='card'>
		<a href='https://www.youtube.com/embed/\
${xss.inHTMLData(result[0][i].video_id)}?rel=0&autoplay=1'>
			<img src='https://img.youtube.com/vi/\
${xss.inHTMLData(result[0][i].video_id)}/mqdefault.jpg'>
        </a>
        <p title='Published ${
            xss.inHTMLData
            (
                moment.unix(result[0][i].video_published)
                .local()
                .fromNow()
            )}'>\
${xss.inHTMLData(validator.unescape(result[0][i].channel_name))}</p>
        <a href='https://www.youtube.com/watch?v=\
${xss.inHTMLData(result[0][i].video_id)}'>
            <h4 title='${xss.inHTMLData
                (entities.encodeHTML
                    (validator.unescape
                        (result[0][i].video_description)))}'>\
${xss.inHTMLData(validator.unescape(result[0][i].video_title))}</h4>
        </a>
	</div>`;
			}

			full += `</div>`

			full +=
                `
    <div class='channels'>
        <h3>Channels</h3>
        <br>
		<ul>`;

			result[1].forEach((elem) => {
				full +=
					`
		   <li><a href='https://www.youtube.com/channel/\
${xss.inHTMLData(elem.channel_id)}'>\
${xss.inHTMLData(validator.unescape(elem.channel_name))}</a></li>`;
			});

			full +=
				`
		</ul>
    </div>
    <br>
    <!-- This file was generated on ${new Date().toLocaleString()}, ${
        new Date().getTime()} -->
</body>
</html>
`;
        fs.writeFileSync(global.html, full);
        return true;
    });
}

/**
 * Promt to enter integer, if there is a matching ch_ch_id, then delete
 * @returns {Promise}
 */
function remove_subscription()
{
    return list_subscriptions(true)
    .then(() =>
    {
        return new Promise((resolve, reject) =>
        {
            let rl = require('readline').createInterface
            ({
                input: process.stdin,
                output: process.stdout
            });

            rl.question('Enter the channel number you wish to remove: ', (answer) =>
            {
                let channel_number;
                if(validator.isInt(answer))
                {
                    channel_number = Number(answer);
                    resolve
                    (
                        sql_promise
                        (
                            `
                            DELETE FROM videos
                            WHERE
                                channel_id_id=${channel_number}
                            `
                        )
                        .then(() =>
                        {
                            return sql_promise
                            (
                                `
                                DELETE FROM subscriptions
                                WHERE
                                    channel_id_id=${channel_number}
                                `
                            );
                        })
                        .then(() =>
                        {
                            console.info
                            (
                                '--If it was in subscription list',
                                'it has now been successfully removed');
                        })
                    );
                }
                else reject('Invalid input, not an integer');
            });
        });
    });
}

/**
 * Close db and exit
 * @param {Number} code Exit code
 */
function close_everything(code)
{
    return new Promise((resolve, reject) =>
    {
        // TODO: need global ?
        db.close((err) =>
        {
            if(err) { console.error('=> Error:\n', err); process.exit(1) }
            else resolve();
        });
    })
    .then(() =>
    {
        process.exit(code);
    });
}

/**
 * Convert subscription list (name and id) into JSON and save at export_file location
 * @returns {Promise}
 */
function export_subscription_list()
{
    return new Promise((resolve, reject) =>
    {
        db.all
        (
            `SELECT * FROM subscriptions`,
            (err, rows) =>
            {
                if(err) reject(err);


                let subs = [];
                for(let i = 0; i < rows.length; ++i)
                {
                    subs.push
                    (
                        [rows[i].channel_id, validator.unescape(rows[i].channel_name)]
                    );
                }

                let export_file = path.join(global.dot, 'subscriptions.json');
                fs.writeFileSync
                (
                    export_file,
                    JSON.stringify(subs)
                );

                console.info(`--Exported ${export_file}`);

                resolve();
            }
        );
    });
}

/**
 * Add a subscription given channel ID and channel name
 * @param {String} ch_id
 * @param {String} ch_name
 */
function insert_a_subscription(ch_id, ch_name)
{
    return new Promise((resolve, reject) =>
    {
        db.run
        (
            `
            INSERT INTO subscriptions
                (channel_id, channel_name)
            VALUES
                ('${ch_id}', '${ch_name}');
            `,
            (result) =>
            {
                if(result && result.errno)
                {
                    if(result.errno == 19)
    console.info(`Already subscribed. Skipping: '${entities.decodeHTML
                                                    (validator.unescape
                                                        (ch_name))}' (${ch_id})`);
                    else
    console.info(result);
                }
                else if(result === null)
    console.info(`You are now subscribed to '${entities.decodeHTML
                                                (validator.unescape
                                                    (ch_name))}' (${ch_id})`);
                else
    console.error('=> Error', result);
                resolve();
            }
        );
    });
}

/**
 * Given valid exported subscription JSON, imports subscription into db
 * @param {String} json_file
 * @returns {Promise}
 */
function import_subscription_list(json_file)
{
    try
    {
        let imported = fs.readFileSync(json_file);
        let arr;
        try
        {
            arr = JSON.parse(imported);
        }
        catch(err)
        {
            console.error(`=> Error: File doesn't contain valid JSON`);
            throw err;
        }

        let promises = [];
        for(let i = 0; i < arr.length; ++i)
        {
            if(
                !validator.isWhitelisted
                (
                    arr[i][0].toLowerCase(),
                    'abcdefghijklmnopqrstuvwxyz0123456789-_'
                )
            )
            {
                console.error('=> SKIPPING CORRUPTED DATA:', arr[i]);
                continue;
            }
            promises.push
            (
                insert_a_subscription
                (
                    arr[i][0],
                    validator.escape(arr[i][1])
                )
            );
        }

        return Promise.all(promises);
    }
    catch(err)
    {
        if(err.code === 'ENOENT')
        {
            console.error(`=> Error: File not found`);
            process.exit(0);
        }
        else
        {
            throw err;
        }
    }
}

/// ----------------------------------



let getopt = new Getopt
([
  ['s', 'subscribe=ARG', 'Subscribe with a video/channel url'],
  ['u', 'update', 'Fetch new updates from channels'],
  ['n', 'onei', 'Interactively select and update a channel'],
  ['', 'one=ARG', 'Update a specific known channel'],
  ['g', 'generate', 'Generate yt_view_subscriptions.html'],
  ['o', 'open', 'Open generated html file in default browser'],
  ['l', 'list', 'Print a list of your subscrbed channels'],
  ['p', 'progress', 'Prints progress information for update'],
  ['r', 'remove', 'Prompts to remove a subscription'],
  ['e', 'export', 'Exports subscription list in a JSON file'],
  ['i', 'import=ARG', 'Imports subscriptions given JSON file'],
  ['v', 'version', 'Prints running version'],
  ['h', 'help', 'Display this help']
])
.setHelp
(
`
Usages:

  vidlist [options] [arguments]
  sub     [options] [arguments]
  vl      [options] [arguments]

[[OPTIONS]]

NOTE:

1. Progress option works with update options only
2. Options to update, generate and open can be combined. For
   all other options, combining will produce unexpeted results
3. Program file is in directory:
   ${__dirname}
4. Database and exported JSON files will be kept in directory:
   ${global.dot}
5. Generated HTML file location will be:
   ${global.html}
6. Variable 'global.old_video_limit_sec' near the top of
   'index.js' file determines the maximum age of a video
   (since published) to keep in database for use, any older
   videos are removed on update. Default limit is set to 15
   days
7. Bug report goes here:
   https://github.com/dxwc/vidlist/issues
8. This software and latest update information are stored here:
   https://www.npmjs.com/package/vidlist

This software was not produced by or directly for YouTube, LLC and has no
affiliation with the LLC. Use this software only at your own volition.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

EXAMPLE Usages:

> Subscribe to a youtube channel:

vl https://www.youtube.com/watch?v=EeNiqKNtpAA

    or

vl -s https://www.youtube.com/watch?v=EeNiqKNtpAA

> Remove a subscription:

vl --remove

> List your subscriptions:

vl --list

> Pull update from channel feed, show update progress, generate HTML
and open the HTML with your default browser:

vl -upgo

> update ONLY a specific channel interactively, show progress, generate
html and then open the HTML with your default browser:

vl -npgo

> update particular known selection or selections of channel
(eg: channel 3,4,5) show progress, generate html and then
open the HTML with your default browser

vl --one 3,4,5 -pgo
`
)
.error(() =>
{
    console.info('Invalid option\n', getopt.getHelp());
    process.exit(1);
});

let opt = getopt.parse(process.argv.slice(2));

if(process.argv.length <= 2 || opt.options.help)
{
    console.info(getopt.getHelp());
    process.exit(0);
}

if(opt.options.version)
{
    console.info('vidlist 0.1.1');
    process.exit(0);
}

open_db_global()
.then(() =>
{
    if(opt.options.progress) global.prog = true;

    if(opt.options.list)
        return list_subscriptions();
    else if(opt.options.export)
        return export_subscription_list();
    else if(opt.options.import)
    {
        global.is_import = true;
        return import_subscription_list(opt.options.import);
    }
    else if(opt.options.remove)
        return remove_subscription();
    else if(opt.options.subscribe)
        return subscribe(opt.options.subscribe);
    else if(opt.options.update)
        return download_and_save_feed()
        .then(() =>
        {
            if(global.prog)
            process.stdout.write(': Removing any older [see -h] data from db\r');
        })
        .then(() => keep_db_shorter());
    else if(opt.options.onei)
    {
        global.remaining = 1;
        return download_and_save_one_feed().then(() => keep_db_shorter());
    }
    else if(opt.options.one)
    {
        if(typeof opt.options.one === 'string')
        {

            if(validator.isInt(opt.options.one))
                return download_and_save_one_feed(opt.options.one)
                   .then(() => keep_db_shorter());
            else
            {
                let arr = opt.options.one.split(',');
                let promise_chain = Promise.resolve();
                global.remaining = 0;
                arr.forEach((val) =>
                {
                    if(typeof val === 'string' && validator.isInt(val))
                    {
                        ++global.remaining;
                        promise_chain = promise_chain.then(() =>
                        {
process.stdout.write('                                   \r');
process.stdout.write(`: Fetching update channel #${val}\r`);
                            return download_and_save_one_feed(val);
                        });
                    }
                    else
                    {
                        console.error('=> Skipping update for invalid input:', val);
                    }
                });

                if(global.remaining === 0) return Promise
                .reject('No updates were performed due to invalid input/s');

                return promise_chain.then(() => keep_db_shorter());
            }
        }
        else throw new Error('Argument to --one is not an integer');
    }
    else if(opt.options.generate || opt.options.open)
    {
        return true;
    }
    else if(validator.isURL(process.argv[2]))
    {
        opt.options.subscribe = true;
        return subscribe(process.argv[2]);
    }
    else
    {
        console.info(getopt.getHelp());
        return close_everything(1);
    }
})
.then(() =>
{
    if(opt.options.update || opt.options.onei || opt.options.one)
    {
        if(global.prog)
        process.stdout.write(`                                                 \r`);
        if(opt.options.one)
        process.stdout.write('                                   \r');
        console.info('--Fetched updates');
    }
    else if
    (
        opt.options.list ||
        opt.options.subscribe ||
        opt.options.remove ||
        opt.options.export ||
        opt.options.import
    )
    {
        return close_everything(0);
    }

    if(opt.options.generate) return generate_html();
    else return true;
})
.then(() =>
{
    if(opt.options.generate) console.info('--Generated HTML');
    if(opt.options.open)
    {
        if(require('os').platform() === 'win32') return opn(global.html);
        else return opn(global.html, { wait : false });
    }
    else
    {
        return true;
    }
})
.then(() =>
{
    if(opt.options.open)
    {
        console.info('--Asked OS to open HTML with your default web browser');
    }
    close_everything(0);
})
.catch((err) =>
{
    console.error('=> There was an error in operation:\n', err);
    close_everything(1);
});