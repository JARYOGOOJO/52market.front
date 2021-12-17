import axios from 'axios';
import $ from 'jquery'
import '@popperjs/core'
import 'bootstrap'
import './css/bootstrap.min.css';
import './css/main.css'
import './kakao'
import './aba5c3ead0';
import _ from 'lodash';
import SockJS from 'sockjs-client'
import {Stomp} from '@stomp/stompjs'
export {userId, getArticles, callComments};
import {setHeader, addComment, chatView, setModal, registerView, logInView, drawArticle} from './view'

let API_URL;
let stompClient;
let userId;
let loading = false;
let scrollable = true;
let page = 1;
Kakao.init("e1289217c77f4f46dc511544f119d102");
window.onload = () => setHeader()

// 무-한 스크롤 무야호
window.onscroll = _.throttle(function () {
    const {innerHeight} = window;
    const {scrollHeight} = document.body;
    const scrollTop =
        (document.documentElement && document.documentElement.scrollTop)
        || document.body.scrollTop;
    if (scrollHeight - innerHeight - scrollTop < 1000) {
        if (scrollable) {
            if (!loading) {
                console.log("get articles...")
                getArticles();
            }
        }
    }
}, 500)

// 랜덤 UUID 만들기
const genRandomName = length => {
    let name = '';
    let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ" + "abcdefghijklmnopqrstuvwxyz" + "0123456789";
    let charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        let number = Math.random() * charactersLength;
        let index = Math.floor(number);
        name += characters.charAt(index);
    }
    return name;
}

// 랜덤 UUID 숫자형 만들기
const genLongNumber = length => {
    if (length < 1) return;
    let number = Math.random() * (10 ** (length));
    return Math.floor(number);
}

// 카카오톡 로그인하기
export function loginWithKakao() {
    Kakao.Auth.login({
        success: function (authObj) {
            console.log(authObj)

            axios.post(`${API_URL}/user/kakao`, {'token': `${authObj['access_token']}`})
                .then(response => {
                    console.log(response)
                    localStorage.setItem("token", response.data['token']);
                    localStorage.setItem("userId", response.data['userId']);
                    window.location.hash = '';
                    setHeader();
                })
                .catch((err) => console.log(err))
        },
        fail: function (err) {
            alert(JSON.stringify(err))
        }
    })
}

// 일반 로그인하기
export function login() {
    const email = $("#exampleInputEmail1").val();
    const password = $("#exampleInputPassword1").val();
    if (!(email && password)) {
        alert("올바른 아이디와 비밀번호를 입력해주세요.")
    }
    axios.post(`${API_URL}/user/signin`, {
        email: email,
        password: password,
    })
        .then(function (response) {
            console.log(response);
            const {data} = response;
            if (data) {
                localStorage.setItem("token", response.data['token']);
                localStorage.setItem("userId", response.data['userId']);
                window.location.hash = '';
                setHeader();
            }
        })
        .catch(function (error) {
            console.log(error);
            alert("로그인에 실패했습니다.")
        });
}

// 회원가입하기
export function signup() {
    const email = $("#exampleInputEmail1").val();
    const name = $("#inputDefault").val();
    const phone = $("#phoneDefault").val();
    const password = $("#exampleInputPassword1").val();
    const repassword = $("#exampleInputPassword2").val();
    let latitude;
    let longitude;
    if (password !== repassword) {
        alert("패스워드가 일치하지 않습니다.")
        return;
    }
    navigator
        .geolocation
        .getCurrentPosition((position) => {
            latitude = position.coords.latitude;
            longitude = position.coords.longitude;
        }, (error) => {
            console.log(error)
            latitude = 37.49798901601007;
            longitude = 127.03796438656106;
        });
    axios.post(`${API_URL}/user/signup`, {
        email,
        name,
        phoneNumber: phone,
        password,
        latitude,
        longitude
    })
        .then(function (response) {
            console.log(response);
            localStorage.setItem("token", response.data['token']);
            localStorage.setItem("userId", response.data['userId']);
            window.location.hash = '';
        })
        .catch(function (error) {
            console.log(error);
        });
    setHeader();
}

// 이메일 유효성 검사
export const checkEmail = () => {
    const email = $("#exampleInputEmail1").val();
    const regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (!regex.test(email)) {
        $("#emailHelp").text("이메일 형식이 올바르지 않습니다.");
        $("#submit").attr("disabled", true);
    } else {
        $("#emailHelp").text("");
    }
}

// 자동으로 전화번호 형태 만들기
export const autoHyphen = (target) => {
    target.value = target.value
        .replace(/[^0-9]/, '')
        .replace(/^(\d{2,3})(\d{3,4})(\d{4})$/, `$1-$2-$3`);
}

// 비밀 번호 유효성 검사
export const passwordOK = () => {
    const password = $("#exampleInputPassword1").val();
    const repassword = $("#exampleInputPassword2").val();
    const regex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!regex.test(password)) {
        $("#pwdHelp").text("비밀번호 양식이 올바르지 않습니다. (영문,소문자 8자 이상)");
        $("#submit").attr("disabled", true);
    } else if (repassword && (password !== repassword)) {
        $("#repwdHelp").text("비밀번호와 확인이 일치하지 않습니다.");
        $("#submit").attr("disabled", true);
    } else {
        $("#pwdHelp").text("");
        $("#repwdHelp").text("");
        $("#submit").attr("disabled", false);
    }
}

// 댓글 달기 창 토글
export function toggleComment(idx) {
    $(`#commentEdit-${idx}`).toggle('fade')
}

// 웹소켓 연결 및 구독 설정
export function connect() {
    userId = parseInt(localStorage.getItem("userId"));
    let socket = new SockJS(`${API_URL}/ws-stomp`);
    stompClient = Stomp.over(socket);
    stompClient.connect({}, function (frame) {
        // setConnected(true);
        console.log('Connected: ' + frame);
        stompClient.subscribe(`/sub/user/notice/${userId}`, notice => {
            let [msg, room] = notice.body.split("room_id: ")
            console.log(msg)
            window.location.hash = `chat?room=${room}`
            let body = {roomId: room, userId: userId}
            stompClient.send(`/pub/api/room/enter`, {}, JSON.stringify(body))
            chatIN(room)
        });
        stompClient.subscribe(`/sub/chat/all`, chat => {
            console.log(JSON.parse(chat.body))
        });
        stompClient.subscribe(`/sub/article/notice/all`, article => {
            let {data} = JSON.parse(article.body)
            console.log(data)
            let {user, title, createdAt, content} = data;
            let username = user.name;
            toast(username, title, createdAt, content);
        });
        stompClient.subscribe(`/sub/comment/notice/all`, cmt => {
            console.log(cmt)
            if (cmt.headers.act === "ADD") {
                let {idx, data} = JSON.parse(cmt.body)
                addComment(idx, data)
            } else if (cmt.headers.act === "DEL") {
                let {idx} = JSON.parse(cmt.body)
                $(`#comment-list-${idx}`).empty();
                callComments(idx);
            }
        });
    });
}

// 채팅 신청
export function letsMeet(articleId, commenterId, userId) {
    if (!(articleId && commenterId && userId)) return;
    const body = {
        title: `새로운 대화 ${articleId}`,
        active: true
    }
    axios.post(`${API_URL}/api/room`, body)
        .then((response) => {
            let {roomSubscribeId} = response.data;
            console.log(response.data);
            window.location.hash = `chat?room=${roomSubscribeId}`;
            chatIN(roomSubscribeId)
            let message = {msg: `채팅방에 초대되었습니다. room_id: ${roomSubscribeId}`, userSubscribeId: commenterId}
            stompClient.send(`/pub/user/notice`, {}, JSON.stringify(message))
        })
}

const chatIN = (roomSubscribeId) => {
    stompClient.subscribe(`/sub/chat/room/${roomSubscribeId}`, (greeting) => {
        console.log(greeting.headers)
        take(JSON.parse(greeting.body));
    });
}

const chatOUT = (roomSubscribeId) => {
    return stompClient.unsubscribe(`/sub/chat/room/${roomSubscribeId}`)
}

// 채팅 메세지 객체 (함수형 프로그래밍)
class Message {
    constructor(arg) {
        this.msg = arg.msg;
        this.message_side = arg.message_side;
        this.draw = (_this => function () {
            let $message;
            $message = $($('.message_template').clone().html());
            $message.addClass(_this.message_side).find('.text').html(_this.msg);
            $('.messages').append($message);
            return setTimeout(function () {
                return $message.addClass('appeared');
            }, 0);
        })(this);
        return this;
    }
}

const send = function (msg) {
    let roomSubscribeId = extractParam('room');
    userId = parseInt(localStorage.getItem("userId"));
    $('.message_input').val('');
    let $messages = $('.messages');
    let message = new Message({
        msg: msg,
        message_side: "right"
    });
    let shot = {msg, userId};
    stompClient.send(`/sub/chat/room/${roomSubscribeId}`, {}, JSON.stringify(shot))
    message.draw();
    return $messages.animate({scrollTop: $messages.prop('scrollHeight')}, 300);
};

let take = function (body) {
    let {msg, userId} = body
    let user = parseInt(localStorage.getItem("userId"));
    if (user === parseInt(userId)) {
        return;
    }
    let $messages = $('.messages');
    let message = new Message({
        msg: msg,
        message_side: "left"
    });
    message.draw();
    return $messages.animate({scrollTop: $messages.prop('scrollHeight')}, 300);
};

let getMessageText = () => {
    return $('.message_input').val();
}

export const _keyup = () => {
    if (event.which === 13) {
        sendMessage();
    }
};

export const sendMessage = () => {
    send(getMessageText());
}

// 게시글 작성 시 토스트 나왔다 사라짐
export function toast(username, title, createdAt, content) {
    $("body").append(`
        <div class="toast fade show" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header">
                <strong class="me-auto">${username} - "${title}"</strong>
                <small>${createdAt}</small>
                <button type="button" class="btn-close ms-2 mb-1" data-bs-dismiss="toast" aria-label="Close">
                    <span aria-hidden="true"></span>
                </button>
            </div>
            <div class="toast-body">
                ${content}
            </div>
        </div>`)
    setTimeout(() => $(".toast.fade").remove(), 3000);
}

// 글 작성하기
export function Write() {
    userId = parseInt(localStorage.getItem("userId"));
    const formData = new FormData();
    formData.append('userId', userId)
    let $formFile = $("#formFile")[0].files[0]
    if (typeof $formFile != 'undefined') formData.append("file", $formFile);
    formData.append('title', $("#exampleFormControlInput1").val())
    formData.append('content', $("#exampleFormControlTextarea1").val())
    axios.post(`${API_URL}/api/articles`, formData)
        .then(function (response) {
            console.log(response)
            window.location.reload();
            stompClient.send(`/sub/article/notice/all`,
                {"act": "ADD"}, JSON.stringify({data: response.data}))
        })
        .catch(function (error) {
            console.log(error);
            console.log("글 작성에 실패했습니다.")
        })
}

export function editArticle(idx) {
    axios.get(`${API_URL}/api/article/${idx}`)
        .then(response => {
            let {id, title, content, user} = response.data;
            let answer = window.prompt("수정할 내용을 입력해주세요.", content)
            if (answer) {
                let send = {id, title, content: answer, userId};
                console.log(send)
                axios.put(`${API_URL}/api/article`, send).then(() => window.location.reload());
            }
        })
}

// 글 내용만 수정하기
export function deleteArticle(idx) {
    userId = parseInt(localStorage.getItem("userId"));
    axios
        .delete(`${API_URL}/api/article/${idx}`)
        .then(function (response) {
            console.log(response);
            window.location.reload();
        })
        .catch(function (error) {
            console.log(error);
            console.log("글 삭제에 실패했습니다.")
        })
}

// 댓글 작성하기
export function writeComment(idx) {
    userId = parseInt(localStorage.getItem("userId"));
    let commentWriteBtn = $(`#commentWrite-${idx}`);
    let content = commentWriteBtn.val();
    commentWriteBtn.val("");
    console.log(content);
    const body = {articleId: idx, userId, content}
    axios.post(`${API_URL}/api/comment`, body)
        .then(({data}) => {
            stompClient.send(`/sub/comment/notice/all`,
                {"act": "ADD"}, JSON.stringify({idx: idx, data: data}))
        })
        .catch(function (error) {
            // handle error
            console.log(error);
        });
}

// 댓글 삭제하기
export function removeComment(idx, id) {
    axios.delete(`${API_URL}/api/comment/${id}`)
        .then(({data}) => console.log(data))
        .then(() => {
            stompClient.send(`/sub/comment/notice/all`,
                {"act": "DEL"}, JSON.stringify({idx: idx}))
        })
}

// 홈 셋팅
const homePage = () => {
    let div = document.createElement("div");
    div.className = "card-deck";
    div.id = "articles-body"
    $("main > div").replaceWith(div);
}

// 게시글 불러오기
const getArticles = () => {
    loading = true;
    userId = parseInt(localStorage.getItem("userId"));
    axios
        .get(`${API_URL}/api/articles?page=${page}`)
        .then(function (response) {
            const {data} = response;
            if (!data.length) {
                scrollable = false;
            }
            data.forEach((article) => {
                drawArticle(article)
                callComments(id);
                $(`#commentEdit-${id}`).hide();
            });
            loading = false;
            page++;
        })
        .catch(function (error) {
            // handle error
            console.log(error);
        });
};

// 댓글 리스트 호출
function callComments(idx) {
    axios
        .get(`${API_URL}/api/comments/${idx}`)
        .then((response) => {
            let {data} = response
            data.forEach((comment) => {
                addComment(idx, comment);
            })
        })
}

// 쿠키 가져오기
export function getCookie(name) {
    const value = "; " + document.cookie;
    const parts = value.split("; " + name + "=");
    if (parts.length === 2) return parts.pop().split(";").shift();
}

// 로컬 스토리지 초기화(로그아웃)
const logOut = () => {
    localStorage.clear();
    window.location.hash = "login"
    setHeader();
}

// 해시태그에서 특정 파라미터 추출하기
function extractParam(word) {
    return window.location.hash.split(word + "=").pop()
}

// 모든 뷰로 이어지는 라우터
const router = () => {
    let path = window.location.hash.replace("#", "")
    connect();
    switch (path) {
        case "":
            homePage();
            getArticles();
            setModal();
            break
        case "signup":
            registerView();
            break
        case "login":
            logInView();
            break
        case "chat":
            chatView();
            break
        case "logout":
            logOut();
    }
    page = 1;
    if (path.startsWith("chat")) {
        chatView();
        let roomSubscribeId = extractParam('room');
        chatIN(roomSubscribeId);
    }
}

window.addEventListener('hashchange', router)

router();
