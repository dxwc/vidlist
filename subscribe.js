const vd = require('vid_data');
const add_subscription = require('./save.js').add_subscription;

async function subscribe(url)
{
    let data = await vd.get_channel_id_and_name(url);
    if(data)
    {
        try
        {
            await add_subscription(data.channel_id, data.channel_name);
        }
        catch(err)
        {
            if(err.errorType === 'uniqueViolated')
            {
                data.existing = true; // if was already subscribed
                return data;
            }
            else
            {
                throw err;
            }
        }
    }
    else
    {
        throw new Error('Unsupported URL');
    }

    return data;
}

module.exports = subscribe;