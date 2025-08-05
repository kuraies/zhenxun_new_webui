import request from '../axios'


export const systemApi = {

    login(data,options = {}){
        return request.post('/login',data,{
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            ...options
        })
    },


    ping(options = {}){
        return request.get('/system/ping',{
            ...options
        })
    },

    test_db(data,options = {}){
        return request.get('/configure/test_db',{
            params:{
                db_url:data
            },
            ...options
        })
    },
    set_configure(params,options = {}){
        return request.post('/configure/set_configure',
            params,{
                ...options
            }
        )
    },

}
