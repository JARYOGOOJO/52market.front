import axios from 'axios'
import $ from 'jquery'
import '@popperjs/core'
import 'bootstrap'
import './css/bootstrap.min.css'
import './css/main.css'
import './kakao'
import './aba5c3ead0'
import _ from 'lodash'
import SockJS from 'sockjs-client'
import {Stomp} from '@stomp/stompjs'
import {setHeader, addComment, chatView, setModal, registerView, logInView, drawArticle, homePage} from './view'

let DOMAIN = API_URL
let stompClient
export let userId
let userSubscribeId
let loading = false
let scrollable = true
let page = 1
Kakao.init("e1289217c77f4f46dc511544f119d102")
window.onload = () => setHeader()

// 무-한 스크롤 무야호
$(window).scroll(() => _.throttle(function () {
    const {innerHeight} = window
    const {scrollHeight} = document.body
    const scrollTop =
        (document.documentElement && document.documentElement.scrollTop)
        || document.body.scrollTop
    if (scrollHeight - innerHeight - scrollTop < 1000) {
        if (scrollable) {
            if (!loading) {
                console.log("get articles...")
                getArticles()
            }
        }
    }
}, 500))

const setToken = (data) => {
    sessionStorage.setItem("token", data['token'])
    localStorage.setItem("refreshToken", data['refreshToken'])
    sessionStorage.setItem("userId", data['userId'])
    sessionStorage.setItem("userSubscribeId", data['userSubscribeId'])
}

// 카카오톡 로그인하기
export function loginWithKakao() {
    Kakao.Auth.login({
        success: function (authObj) {
            console.log(authObj)

            axios.post(`${DOMAIN}/user/kakao`, {'token': `${authObj['access_token']}`})
                .then(response => {
                    console.log(response)
                    setToken(response.data)
                    window.location.hash = ''
                    setHeader()
                })
                .catch((err) => console.log(err))
        },
        fail: function (err) {
            alert(JSON.stringify(err))
        }
    })
}

// 일반 로그인하기
export function loginToAuth() {
    const email = $("#exampleInputEmail1").val()
    const password = $("#exampleInputPassword1").val()
    if (!(email && password)) {
        alert("올바른 아이디와 비밀번호를 입력해주세요.")
    }
    axios.post(`${DOMAIN}/user/signin`, {
        email: email,
        password: password,
    })
        .then(function (response) {
            console.log(response)
            const {data} = response
            if (data) {
                setToken(data)
                window.location.hash = ''
                setHeader()
            }
        })
        .catch(function (error) {
            console.log(error)
            alert("로그인에 실패했습니다.")
        })
}

// 회원가입하기
export function signupToAuth() {
    let latitude
    let longitude
    navigator
        .geolocation
        .getCurrentPosition((position) => {
            latitude = position.coords.latitude
            longitude = position.coords.longitude
        }, (error) => {
            console.log(error)
            latitude = 37.49798901601007
            longitude = 127.03796438656106
        })
    const email = $("#exampleInputEmail1").val()
    const name = $("#inputDefault").val()
    const phone = $("#phoneDefault").val()
    const password = $("#exampleInputPassword1").val()
    const rePassword = $("#exampleInputPassword2").val()
    if (password !== rePassword) {
        alert("패스워드가 일치하지 않습니다.")
        return
    }
    axios.post(`${DOMAIN}/user/signup`, {
        email,
        name,
        phoneNumber: phone,
        password,
        latitude,
        longitude
    })
        .then(function (response) {
            console.log(response)
            setToken(response.data)
            window.location.hash = ''
        })
        .catch(function (error) {
            console.log(error)
        })
    setHeader()
}

// 댓글 달기 창 토글
export function toggleComment(idx) {
    $(`#commentEdit-${idx}`).toggle('fade')
}

// 웹소켓 연결 및 구독 설정
export const connect = async () => {
    userId = parseInt(sessionStorage.getItem("userId"))
    userSubscribeId = sessionStorage.getItem("userSubscribeId")
    let socket = new SockJS(`${DOMAIN}/ws-stomp`)
    stompClient = Stomp.over(socket)
    stompClient.connect({}, function (frame) {
        console.log('Connected: ' + frame)
        stompClient.subscribe(`/sub/notice/user/${userId}`, notice => {
            setTimeout(()=>{
                console.log(notice)
                let roomSubscribeId = JSON.parse(notice.body).content
                window.location.hash = `chat?room=${roomSubscribeId}`
            }, 1000)
        })
        stompClient.subscribe(`/sub/notice/article`, article => {
            let data = JSON.parse(article.body)
            console.log(data)
            let {createdAt, title, content} = data
            toast(title, createdAt, content)
        })
        stompClient.subscribe(`/sub/notice/comment`, cmt => {
            let body = JSON.parse(cmt.body)
            let {type, senderId, targetId} = body
            console.log(body)
            if (type === "COMMENT") {
                if (senderId !== userId) {
                    $(`comment-list-${targetId}`).empty()
                    callComments(targetId)
                }
            } else {
                $(`#removeComment-${targetId}`)
                    .parent().parent().remove()
                $(`#letsMeet-${targetId}`)
                    .parent().parent().remove()
            }
        })
    })
    return stompClient;
}

function chatIN (roomSubscribeId) {
    let body = {roomSubscribeId, userId}
    axios.post(`${DOMAIN}/room/enter`, body).then(value => console.log(value))
    stompClient.subscribe(`/sub/chat/${roomSubscribeId}`, greeting => {
        let topic = JSON.parse(greeting.body)
        if (userId !== topic["senderId"]) {
                take(topic)
            }
    })
}

const chatOUT = (roomSubscribeId) => {
    return stompClient.unsubscribe(`/sub/chat/${roomSubscribeId}`)
}

// 채팅 신청
export function letsChitChat(articleId, commenterId, userId) {
    if (!(articleId && commenterId && userId)) return
    const body = {
        userId,
        targetId: commenterId,
        title: `새로운 대화 ${articleId}`,
        active: true
    }
    axios.post(`${DOMAIN}/new/room`, body)
        .then((response) => {
            console.log(response)
            let {roomSubscribeId} = response.data
            window.location.hash = `chat?room=${roomSubscribeId}`
            chatIN(roomSubscribeId)
            let content = roomSubscribeId
            let message = {userId, content, targetId: commenterId}
            stompClient.send(`/pub/new/notices`, {}, JSON.stringify(message))
        })
}

// 채팅 메세지 객체 (함수형 프로그래밍)
class Message {
    constructor(arg) {
        this.content = arg.content
        this.message_side = arg.message_side
        this.draw = (_this => function () {
            let $message
            $message = $($('.message_template').clone().html())
            $message.addClass(_this.message_side).find('.text').html(_this.content)
            $('.messages').append($message)
            return setTimeout(function () {
                return $message.addClass('appeared')
            }, 0)
        })(this)
        return this
    }
}

const send = function (content) {
    let roomSubscribeId = extractParam('room')
    userId = parseInt(sessionStorage.getItem("userId"))
    $('.message_input').val('')
    let $messages = $('.messages')
    let message = new Message({
        content,
        message_side: "right"
    })
    let shot = {...message, userId, roomSubscribeId}
    stompClient.send(`/pub/chat/messages`, {}, JSON.stringify(shot))
    message.draw()
    return $messages.animate({scrollTop: $messages.prop('scrollHeight')}, 300)
}

let take = function (body) {
    let {content, userId} = body
    let user = parseInt(sessionStorage.getItem("userId"))
    if (user === parseInt(userId)) {
        return
    }
    let $messages = $('.messages')
    let message = new Message({
        content,
        message_side: "left"
    })
    message.draw()
    return $messages.animate({scrollTop: $messages.prop('scrollHeight')}, 300)
}

let getMessageText = () => {
    return $('.message_input').val()
}

export const sendMessage = () => {
    send(getMessageText())
}

// 게시글 작성 시 토스트 나왔다 사라짐
export function toast(title, createdAt, content) {
    $("body").append(`
        <div class="toast fade" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header">
                <strong class="me-auto">"${title}"</strong>
                <small>${createdAt}</small>
                <button type="button" class="btn-close ms-2 mb-1" data-bs-dismiss="toast" aria-label="Close">
                    <span aria-hidden="true"></span>
                </button>
            </div>
            <div class="toast-body">
                ${content}
            </div>
        </div>`)
    let $toast_fade = $(".toast.fade")
    $toast_fade.addClass('show')
    setTimeout(() => {
        $toast_fade.removeClass('show')
        $toast_fade.remove()
    }, 3000)
}

// 글 작성하기
export function writeArticle() {
    userId = parseInt(sessionStorage.getItem("userId"))
    const formData = new FormData()
    formData.append('userId', userId)
    let $formFile = $("#formFile")[0].files[0]
    if (typeof $formFile != 'undefined') formData.append("file", $formFile)
    formData.append('title', $("#exampleFormControlInput1").val())
    formData.append('content', $("#exampleFormControlTextarea1").val())
    axios.post(`${DOMAIN}/api/articles`, formData)
        .then(function ({data}) {
            let body = {userId, ...data}
            stompClient.send(`/pub/new/articles`,
                {}, JSON.stringify(body))
            window.location.reload()
        })
        .catch(function (error) {
            console.log(error)
            console.log("글 작성에 실패했습니다.")
        })
}

// 글 내용만 수정하기
export function editArticle(idx) {
    axios.get(`${DOMAIN}/api/article/${idx}`)
        .then(response => {
            let {id, title, content, user} = response.data
            let answer = window.prompt("수정할 내용을 입력해주세요.", content)
            if (answer) {
                let send = {id, title, content: answer, userId}
                console.log(send)
                axios.put(`${DOMAIN}/api/article`, send).then(() => window.location.reload())
            }
        })
}

// 글 삭제하기
export function deleteArticle(idx) {
    userId = parseInt(sessionStorage.getItem("userId"))
    axios
        .delete(`${DOMAIN}/api/article/${idx}`)
        .then(function (response) {
            console.log(response)
            window.location.reload()
        })
        .catch(function (error) {
            console.log(error)
            console.log("댓글이 있는 게시물을 삭제할 수 없습니다.")
        })
}

// 댓글 작성하기
export function writeComment(idx) {
    userId = parseInt(sessionStorage.getItem("userId"))
    let commentWrite = $(`#commentWrite-${idx}`)
    let content = commentWrite.val()
    commentWrite.val("")
    console.log(content)
    const body = {articleId: idx, userId, content}
    axios.post(`${DOMAIN}/api/comment`, body)
        .then((response) => {
            console.log(response)
            let {data} = response
            addComment(idx, data)
            stompClient.send(`/pub/new/comments`,
                {}, JSON.stringify({userId, targetId: idx, ...data}))
        })
        .catch(function (error) {
            // handle error
            console.log(error)
        })
}

// 댓글 삭제하기
export function removeComment(idx, id) {
    userId = parseInt(sessionStorage.getItem("userId"))
    axios.delete(`${DOMAIN}/api/comment/${id}`)
        .then(() => {
            stompClient.send(`/pub/del/comments`,
                {}, JSON.stringify({userId, targetId: id}))
        })
}

// 게시글 불러오기
const getArticles = () => {
    loading = true
    userId = parseInt(sessionStorage.getItem("userId"))
    axios
        .get(`${DOMAIN}/api/articles?page=${page}`)
        .then(function (response) {
            const {data} = response
            if (!data.length) {
                scrollable = false
            }
            data.forEach((article) => {
                drawArticle(article)
                callComments(article.id)
                $(`#commentEdit-${article.id}`).hide()
            })
            loading = false
            page++
        })
        .catch(function (error) {
            // handle error
            console.log(error)
        })
}

// 댓글 리스트 호출
export function callComments(idx) {
    axios
        .get(`${DOMAIN}/api/comments/${idx}`)
        .then((response) => {
            let {data} = response
            data.forEach((comment) => {
                addComment(idx, comment)
            })
        })
}

// 로컬 스토리지 초기화(로그아웃)
const logOut = () => {
    sessionStorage.clear()
    window.location.hash = "login"
    setHeader()
}

// 해시태그에서 특정 파라미터 추출하기
function extractParam(word) {
    return window.location.hash.split(word + "=").pop()
}

// 모든 뷰로 이어지는 라우터
const router = () => {
    let path = window.location.hash.replace("#", "")
    if (!stompClient)
        connect().then(r => console.log(r))
    setHeader()
    page = 1
    if (_.startsWith(path, "chat")) {
        chatView()
        setTimeout(()=>{
            let room = extractParam('room')
            chatIN(room)
        }, 1000)
    } else if (path === "signup") {
        registerView()
    } else if (path === "login") {
        logInView()
    } else if (path === "logout") {
        logOut()
    } else if (path === "") {
        homePage()
        getArticles()
        setModal()
    }
}
window.addEventListener('hashchange', router)

router()
