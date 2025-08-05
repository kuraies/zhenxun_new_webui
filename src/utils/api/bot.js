import request from '@/utils/axios/index.js'

export const botApi ={
    get_bot_list(options = {}){
        return request.get('/dashboard/get_bot_list',{
            ...options
        })
    },
    get_chat_and_call_count(options = {}){
        return request.get('/dashboard/get_chat_and_call_count',{
            ...options
        })
    },
    // kook
    /*
            {
                "suc": true,
                "code": 200,
                "info": "拿到信息啦!",
                "warning": null,
                "data": [
                {
                    "self_id": "3380901290",
                    "nickname": "3380901290",
                    "ava_url": "https://img.kookapp.cn/assets/2023-01/8GfLuYm36l0rs0rs.jpeg?x-oss-process=style/icon",
                    "platform": "kaiheila",
                    "friend_count": 2,
                    "group_count": 0,
                    "received_messages": 0,
                    "day_call": 0,
                    "connect_time": 1753110117,
                    "connect_date": "2025-07-21 23:01:59"
                }
            ]
            }
            */
    // qq
    /*
    {
        "suc": true,
        "code": 200,
        "info": "拿到信息啦!",
        "warning": null,
        "data": [
        {
            "self_id": "2998373045",
            "nickname": "氷川鏡華",
            "ava_url": "http://q1.qlogo.cn/g?b=qq&nk=2998373045&s=160",
            "platform": "qq",
            "friend_count": 15,
            "group_count": 11,
            "received_messages": 2117,
            "day_call": 0,
            "connect_time": 1753111645,
            "connect_date": "2025-07-21 23:27:23"
        }
    ]
    }
    */

    get_base_info(id,options = {}){

    },
    /*
{
    "suc": true,
    "code": 200,
    "info": "拿到信息啦!",
    "warning": null,
    "data": [
    {
        "self_id": "2998373045",
        "nickname": "氷川鏡華",
        "ava_url": "http://q1.qlogo.cn/g?b=qq&nk=2998373045&s=160",
        "friend_count": 15,
        "group_count": 11,
        "received_messages": 2117,
        "connect_time": 1753111645,
        "connect_date": "2025-07-21 23:27:25",
        "connect_count": 79,
        "status": true,
        "is_select": true,
        "day_call": 0,
        "version": "v0.2.4-2c97eea"
    }
]
}*/
}