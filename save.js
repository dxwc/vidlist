const Datastore = require('nedb');
const db = {};

db.subscription = new Datastore('./subscription.data');
db.video        = new Datastore('./video.data');

db.subscription.loadDatabase();
db.video.loadDatabase();

function add_video(id, channel_id, title, published, watched)
{
    return new Promise((resolve, reject) =>
    {
        db.video.update
        (
            { _id : id },
            {
                $set :
                {
                    _id : id,
                    ch  : channel_id,
                    ti  : title,
                    pu  : published,
                    wa  : watched
                }
            },
            { upsert : true },
            (err) =>
            {
                if(err) return reject(err);
                else return resolve();
            }
        );
    });
}

function add_subscription(channel_id, channel_name)
{
    return new Promise((resolve, reject) =>
    {
        db.subscription.insert
        (
            {
                _id : channel_id,
                nm  : channel_name
            },
            (err) =>
            {
                if(err) return reject(err);
                else return resolve();
            }
        );
    });
}

function get_subscription()
{
    return new Promise((resolve, reject) =>
    {
        db.subscription.find({}, (err, result) =>
        {
            if(err) return reject(err);
            else return resolve(result); // can be undefined
        });
    });
}

module.exports.add_video        = add_video;
module.exports.add_subscription = add_subscription;
module.exports.get_subscription = get_subscription;