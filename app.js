const fs = require('fs')
const cheerio = require('cheerio')
const async = require('async')
const request = require('superagent')
const _ = require('lodash')

const  config = require('./config/index')

global.log = console.log

// 获取主页面
let getHtml = function (url) {
    return new Promise(function(resolve, reject) {
        request.get(url).end(function (err,result) {
            err ? reject(err) : resolve(cheerio.load(result.text))
        })
    })
}

// 获取所有的科室名称及链接
let getDepartAndHref = function () {
    return new Promise(function (resolve, reject) {
        log('Start get all departments name and href......')
        let allDepart = []
        let departmentS = []        //  单个部门 为了检查是否正确
        let departmentM = []        //  多个部门
        let q = async.queue(async function (url, taskDone)  {
            try {
                let $ = await getHtml(url)
                log('-------------------------------------------')
                log(`download ${url} successed`)
                log('-------------------------------------------')
                $('#categories li i a').each(function(index, element) {
                    let that = $(this)
                    let tof = $(this).next().hasClass('show')
                    let tof2 = $(this).hasClass('show-com')

                    if(!tof && !tof2 && $(this).text()!=''){
                        departmentS.push({
                            title:$(this).text(),
                            href:element.attribs.href,
                            pagesUrl:[],
                            diseases:[] //疾病
                        })
                    } else if (tof && tof2) { //有子科室
                        let subDepart =[]
                        that.parent().parent().children()[1].children.forEach(function(_element,_index){
                            if(_element.name === 'a'){
                                subDepart.push({
                                    title:_element.children[0].data,
                                    href:_element.attribs.href,
                                    pagesUrl:[],
                                    diseases:[]
                                })
                            }
                        })
                        departmentM.push({
                            title:that.text(),
                            href:that.attr('href'),
                            subDepart:subDepart,
                        })
                    } else if(tof2 && !tof){ //有show-com 没有子科室
                        departmentS.push({
                            title:$(this).text(),
                            href:element.attribs.href,
                            pagesUrl:[],
                            diseases:[] 
                        })
                    }
                })
                departmentS.forEach(function(item,idx){
                    if(item.title == '所有科室')
                        departmentS = _.slice(departmentS,1)
                })
                allDepart.push(departmentS)
                allDepart.push(departmentM)
            } catch (err) {
                reject(err)
            }
        },1)
        q.drain = function () {
            log(' Get all departments name and href completed');
            resolve(allDepart)
        }
        q.push(config.baseUrl)
    })
}

// 获取具体科室下所有疾病页面url（不含子科室）
let getAllIllPagesUrlSingle = function (departments) {
    return new Promise(function(resolve, reject) {
        log(`Start get all ill/'s page url......`)
        let q = async.queue(async function ({title:departName, href:departUrl, pagesUrl},taskDone){
            try {
                let $ = await getHtml(departUrl)
                //log(`download ${departUrl} successed`)
                $('.pager a:last-child').each(function (index, element) {
                    let arr = (element.attribs.href.substring(0,element.attribs.href.lastIndexOf('.'))).split('_')
                    let pagesCount = _.parseInt(arr[arr.length-1]) // 总页数
                    let str = element.attribs.href.substring(0,element.attribs.href.lastIndexOf('.'))
                    let commonPart = str.substring(0,str.lastIndexOf('_')+1) //url相同部分
                    //log(`${departName}---${pagesCount}---${commonPart}---${element.attribs.href}`)
                    for(let i = 1; i <= pagesCount;i++ ){
                        pagesUrl.push(commonPart + i + '.html')
                    }
                })
            } catch (err) {
                log(err.message)
            } finally {
                taskDone()
            }
        },config.ConcurrentCounts)

        q.drain = function () {
            log('Done')
            resolve(departments)
        }
        q.push(departments)
    })
}

// 获取具体科室下所有疾病页面url(含子科室)
let getAllIllPagesUrlMulti = function (departments) {
    return new Promise(function(resolve, reject) {
        log(`Start get all ill/'s page url......`)
        let q = async.queue(async function ({subDepart:subDepart},taskDone){
           for(let i = 0; i < subDepart.length; i++) {
               //log(`${subDepart[i].title}--${subDepart.length}--${i}`)
               try {
                    let $ = await getHtml(subDepart[i].href)
                    $('.pager a:last-child').each(function (index, element) {
                    let arr = (element.attribs.href.substring(0,element.attribs.href.lastIndexOf('.'))).split('_')
                    let pagesCount = _.parseInt(arr[arr.length-1]) // 总页数
                    let str = element.attribs.href.substring(0,element.attribs.href.lastIndexOf('.'))
                    let commonPart = str.substring(0,str.lastIndexOf('_')+1) //url相同部分
                    //log(`${_subDepart.title}---${pagesCount}---${commonPart}---${element.attribs.href}`)
                    for(let k = 1; k <= pagesCount;k++ ){
                        subDepart[i].pagesUrl.push(commonPart + k + '.html')
                    }
                })
               } catch (err) {
                   log(err)
               }
           }
            // for(let j = 0; j < subDepart.length; j++){
            //     if(subDepart[j].pagesUrl.length === 0) {
            //         subDepart[j].pagesUrl.push(subDepart[j].href)
            //     }
            // }
        })

        q.drain = function () {
            log(' 获取具体科室下所有疾病页面url(含子科室 ) -----Done')
            resolve(departments)
        }
        q.push(departments)
    })
}


//获取所有病名称(不含子科室)
let getIllNamesSingle = function (departs) {
    return  new Promise(function (resolve,reject){
        log(`start get ill's name ---S`)
        let q = async.queue(async function ({href:url,pagesUrl:pagesUrl,diseases},taskDone) {
            //log(url,pagesUrl.length)
            if(pagesUrl.length === 0){
                //log(url)
                try {
                    let $ = await getHtml(url)
                    $('.ill-lists ul li a').each(function(index,element) {
                            let that = $(this)
                            diseases.push(that.text())
                    })
                } catch (err) {
                    log(err)
                } finally {
                    taskDone()
                }
            } else { 
                for(let i = 0; i < pagesUrl.length; i++ ){
                    //log(pagesUrl[i])
                    try {
                        let $ = await getHtml(pagesUrl[i])
                        $('.ill-lists ul li a').each(function(index,element) {
                                let that = $(this)
                                diseases.push(that.text())

                        })
                    } catch (err) {
                        log(err)
                    } finally {
                        taskDone()
                    }
                }
            }
        },10)

        q.drain = function () {
            log('get name done --S')
            resolve(departs)
        }
        q.push(departs)
    })
}

//获取所有病名称(含子科室)
let getIllNamesMulti = function (departs) {
    return new Promise(function (resolve, reject) {
        log(`start get ill's name ---M`)
        let q = async.queue(async function({href:url,subDepart},taskDone){
            for(let i = 0; i < subDepart.length; i++) {
               if(subDepart[i].pagesUrl.length === 0){
                    //log(url)
                    try {
                        let $ = await getHtml(url)
                        $('.ill-lists ul li a').each(function(index,element) {
                                let that = $(this)
                               subDepart[i].diseases.push(that.text())
                        })
                    } catch (err) {
                        log(err)
                    } 
               } else {
                    for(let j = 0; j < subDepart[i].pagesUrl.length; j++ ){
                    //log(subDepart[i].pagesUrl[j])
                    try {
                        let $ = await getHtml(subDepart[i].pagesUrl[j])
                        $('.ill-lists ul li a').each(function(index,element) {
                                let that = $(this)
                                subDepart[i].diseases.push(that.text())
                        })
                    } catch (err) {
                        log(err)
                    } 
                }
               }
            }
        })
        q.drain = function () {
            log('get name done --M')
            resolve(departs)
        }
        q.push(departs)
    })
}

// 将信息写入文件
function writeJsonToFile(allDeparts) {
    let folder = 'departments'
    let path = `./${folder}`
    let exists = fs.existsSync(path)
    console.log(exists)
    if (!exists) {
        fs.mkdirSync(folder)
    }
    let filePath = `./${folder}/departments.json`
    fs.writeFileSync(filePath, JSON.stringify(allDeparts))
}

async function run () {
    let departs = await getDepartAndHref()

    // 不包括子科室（完成）
    let departs1 = await getAllIllPagesUrlSingle(departs[0])
    departs1 = await getIllNamesSingle(departs1)
    
    // 包含子科室（完成）
    let departs2 = await getAllIllPagesUrlMulti(departs[1])
    ldeparts2 = await getIllNamesMulti(departs2)

    let allDeparts = []
    allDeparts.push(departs1,departs2)

    writeJsonToFile(allDeparts)
}

run()

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at:', p, 'reason:', reason)
    process.exit(0)
})


