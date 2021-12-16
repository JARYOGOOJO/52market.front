import moment from 'moment';
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

let stompClient;
let userId = null;
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
    if (scrollHeight-innerHeight-scrollTop<1000) {
        if (scrollable) {
            if (!loading) {
                console.log("get articles...")
                getArticles();
            }
        }
    }
}, 500)

// 로그인한 사용자인지 판별 후 리퀘스트헤더+내비바 셋팅
function setHeader() {
    let token = localStorage.getItem("token");
    if (token === null) {
        $(".navbar-nav.me-auto").html(`
        <ul class="navbar-nav me-auto">
            <li class="nav-item">
                <a class="nav-link" href="#">Home</a>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="#login">login</a>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="#signup">signup</a>
            </li>
        </ul>`)
    } else {
        axios.defaults.headers.common = {Authorization: `Bearer ${token}`}
        $(".navbar-nav.me-auto").html(`
        <ul class="navbar-nav me-auto">
            <li class="nav-item">
                <a class="nav-link" href="#">Home</a>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="#logout">logout</a>
            </li>
        </ul>`)
    }
}

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
                    location.hash = '';
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
                location.hash = '';
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
        email: email,
        name: name,
        phoneNumber: phone,
        password: password,
        latitude: latitude,
        longitude: longitude
    })
        .then(function (response) {
            console.log(response);
            localStorage.setItem("token", response.data['token']);
            localStorage.setItem("userId", response.data['userId']);
            location.hash = '';
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

// 글쓰기 버튼(fixed) 호출
export const showWriteButton = () => {
    userId = parseInt(localStorage.getItem("userId"));
    if (!userId) {
        alert("로그인 후에 이용할 수 있습니다.")
        location.hash = "login";
    }
    $("#articles-body").append(`
    <button class="btn btn-success"
        data-bs-target="#staticBackdrop"
        data-bs-toggle="modal" id="backDrop"
        type="button">write a post
    </button>`);
}

// 웹소켓 연결 및 구독 설정
export function connect() {
    let socket = new SockJS(`${API_URL}/ws-stomp`);
    stompClient = Stomp.over(socket);
    stompClient.connect({}, function (frame) {
        // setConnected(true);
        console.log('Connected: ' + frame);
        stompClient.subscribe(`/sub/chat/all`, function (greeting) {
            console.log(JSON.parse(greeting.body))
        });
        stompClient.subscribe(`/sub/article/notice/all`, function (greeting) {
            let {data} = JSON.parse(greeting.body)
            console.log(data)
            let {user, title, createdAt, content} = data;
            let username = user.name;
            toast(username, title, createdAt, content);
        });
        stompClient.subscribe(`/sub/comment/notice/all`, function (cmt) {
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
    setTimeout(()=>$(".toast.fade").remove(), 3000)
    ;
}

// 글 작성하기
export function Write() {
    userId = parseInt(localStorage.getItem("userId"));
    const formData = new FormData();
    formData.append('userId', userId)
    if (typeof $("#formFile")[0].files[0] != 'undefined') formData.append("file", $("#formFile")[0].files[0]);
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
                axios.put(`${API_URL}/api/article`, send).then(() => location.reload());
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
            location.reload();
        })
        .catch(function (error) {
            console.log(error);
            console.log("글 삭제에 실패했습니다.")
        })
}

// 댓글 작성하기
export function writeComment(idx) {
    userId = parseInt(localStorage.getItem("userId"));
    const content = $(`#commentWrite-${idx}`).val();
    $(`#commentWrite-${idx}`).val("");
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
        .then(()=> {
            stompClient.send(`/sub/comment/notice/all`,
                {"act": "DEL"}, JSON.stringify({idx:idx}))
    })
}

// 채팅 신청
export function letsMeet(idx, userId) {
    if (!idx) return;
    const body = {
        title: `새로운 대화 ${idx}`,
        active: true
    }
    axios.post(`${API_URL}/api/room`, body)
        .then((response) => {
            let {roomSubscribeId} = response;
            console.log(response.data);
            location.hash = "chat";
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
            if (data.length === 0) {
                scrollable = false;
            }
            data.forEach((article) => {
                const {id, title, content, user, imagePath, imageName} = article;
                const {name} = user;
                let temp_html = `<!-- Card -->
                    <div class="col-xs-12 col-sm-6 col-md-4 mx-auto">
                        <div class="card" style="margin: 10px; min-width: 230px;">
                        <!--Card image-->
                        <div class="view overlay">
                        <img class="card-img-top" src="${imagePath}" alt="${imageName}"><a href="#!">
                        <div class="mask rgba-white-slight"></div>
                        </a></div>
                        <!--Card content-->
                        <div class="card-body">
                        <!--Title-->
                        <h5 class="card-title tit">${title}</h5>
                        <!--Text-->
                        <p class="card-text">${content}</p>
                        <!-- Provides extra visual weight and identifies the primary action in a set of buttons -->
                        <button onclick="console.log(this.title, ${id}, '${name}')" title="like" type="button" class="btn btn-success">
                        <i class="far fa-thumbs-up"></i></button>
                        <button onclick="app.toggleComment(${id})" title="comment" type="button" class="btn btn-success">
                        <i class="fas fa-comments"></i></button>
                        {{__is_this_yours?__}}
                        </div>
                        <div id="commentEdit-${id}" class="input-group m-3 form-floating">
                        <input id="commentWrite-${id}" class="form-control" aria-describedby="button-addon2">
                        <label for="floatingInput">Leave a Comment...</label>
                        <button class="btn btn-success" onclick="app.writeComment(${id})" id="button-addon2">Button</button>
                        </div>
                        <ul class="list-group" id="comment-list-${id}">
                        </ul></div></div>`;
                const no_not_mine = "";
                const my_contents = `
                      <button onclick="app.editArticle(${id})" title="edit" type="button" class="btn btn-success">
                <i class="far fa-edit"></i></button>
                <button onclick="app.deleteArticle(${id})" title="delete" type="button" class="btn btn-success">
                <i class="fas fa-trash-alt"></i></button>`
                if (user.id === userId) {
                    $("#articles-body").append(temp_html.replace("{{__is_this_yours?__}}", my_contents));
                } else {
                    $("#articles-body").append(temp_html.replace("{{__is_this_yours?__}}", no_not_mine));
                }
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

// 게시글 작성 모달 셋팅
function setModal() {
    $("main").append(`
    <div aria-hidden="true" aria-labelledby="staticBackdropLabel" class="modal fade" data-bs-backdrop="static"
        data-bs-keyboard="false" id="staticBackdrop" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <form action="" enctype="multipart/form-data" method="post">
                    <div class="modal-header">
                        <h5 class="modal-title" id="staticBackdropLabel">Modal title</h5>
                        <button aria-label="Close" class="btn-close" data-bs-dismiss="modal" type="button"></button>
                    </div>
                    <div class="modal-body">

                        <div class="mb-3">
                            <label class="form-label" for="exampleFormControlInput1">Title</label>
                            <input class="form-control" id="exampleFormControlInput1" placeholder="share your story"
                                type="text">
                        </div>
                        <div class="mb-3">
                            <label class="form-label" for="exampleFormControlTextarea1">Content</label>
                            <textarea class="form-control" id="exampleFormControlTextarea1" rows="5"></textarea>
                        </div>
                        <input accept="image/*" class="form-control" id="formFile" name="u_file" type="file">
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" data-bs-dismiss="modal" type="button">Close</button>
                        <button class="btn btn-primary" onclick="app.Write();" type="button">Write</button>
                    </div>
                </form>
            </div>
        </div>
    </div>`)
}

// 회원가입 화면
function registerView() {
    document.querySelector("main").innerHTML = `
    <div class="col-lg-3 col-sm-4 m-auto">
         <form action="" style="display: grid;">
             <div class="form-group">
                 <label class="form-label mt-4" for="exampleInputEmail1">Email address</label>
                 <input aria-describedby="emailHelp" class="form-control" id="exampleInputEmail1" oninput="app.checkEmail()"
                     placeholder="enter email" type="email">
                 <small class="form-text text-muted" id="emailHelp"></small>
             </div>
             <div class="form-group">
                 <label class="col-form-label-sm mt-2" for="inputDefault">Name</label>
                 <input aria-describedby="nameHelp" class="form-control" id="inputDefault"
                     placeholder="tell us your name"
                     type="text">
                 <small class="form-text text-muted" id="nameHelp"></small>
             </div>
             <div class="form-group">
                 <label class="col-form-label-sm mt-2" for="phoneDefault">Phone</label>
                 <input aria-describedby="phoneHelp" class="form-control" id="phoneDefault" oninput="app.autoHyphen(this)"
                     pattern="[0-9]{3}-[0-9]{2}-[0-9]{3}" placeholder="insert your phone number" type="tel">
                 <small class="form-text text-muted" id="phoneHelp"></small>
             </div>
             <div class="form-group">
                 <label class="form-label mt-2" for="exampleInputPassword1">Password</label>
                 <input aria-describedby="pwdHelp" class="form-control" id="exampleInputPassword1" oninput="app.passwordOK()"
                     placeholder="password" type="password">
                 <small class="form-text text-muted" id="pwdHelp"></small>
             </div>
             <div class="form-group">
                 <label class="form-label-sm mt-2" for="exampleInputPassword2">re-Password</label>
                 <input aria-describedby="repwdHelp" class="form-control" id="exampleInputPassword2"
                     oninput="app.passwordOK()" placeholder="confirm password" type="password">
                 <small class="form-text text-muted" id="repwdHelp"></small>
             </div>
             <button class="btn mt-3 btn-lg btn-success" disabled id="submit" onclick="app.signup()" type="button">Register
             </button>
         </form>
         <a class="text-success" href="#signin">let me signin</a></div>`
}

// 로그인 화면
function logInView() {
    document.querySelector("main").innerHTML = `
    <div class="col-lg-3 col-sm-4 m-auto">
      <form action="">
        <div class="form-group">
          <label class="form-label-sm mt-4" for="exampleInputEmail1">Email address</label>
          <input autofocus aria-describedby="emailHelp" class="form-control" id="exampleInputEmail1"
                 placeholder="Enter email" type="email">
          <small class="form-text text-muted" id="emailHelp"></small>
        </div>
        <div class="form-group">
          <label class="form-label-sm mt-2" for="exampleInputPassword1">Password</label>
          <input aria-describedby="pwdHelp" class="form-control" id="exampleInputPassword1"
                 onchange="app.passwordOK()" placeholder="Password" type="password">
          <small class="form-text text-muted" id="pwdHelp"></small>
        </div>
        <button class="btn mt-3 btn-lg login btn-login" id="submit" onclick="app.login()" type="button">Login
        </button>
        <button class="btn mt-3 btn-lg login btn-kakao" id="custom-login-btn" onclick="app.loginWithKakao()">Kakao Login</button>
      </form>
      <a class="text-success" href="#signup">let me signup</a>
    </div>`;
}

// 채팅 화면
function chatView() {
    document.querySelector("main").innerHTML = `
  <div class="chat_window">
      <div class="top_menu">
          <div class="buttons">
              <div class="button close"></div>
              <div class="button minimize"></div>
              <div class="button maximize"></div>
          </div>
          <div class="title">Chat</div>
      </div>
      <ul class="messages"></ul>
      <div class="bottom_wrapper clearfix">
          <div class="message_input_wrapper">
              <input class="message_input" placeholder="Type your message here..." onkeyup="app.send()" />
          </div>
          <div class="send_message" onclick="app.sendMessage()">
              <i class="icon fas fa-paper-plane"></i>
              <div class="text"> Send</div>
          </div>
      </div>
  </div>
  <div class="message_template">
      <li class="message">
          <div class="avatar"></div>
          <div class="text_wrapper">
              <div class="text"></div>
          </div>
      </li>
  </div>`
}
// 댓글 생성
function addComment(idx, data) {
    userId = parseInt(localStorage.getItem("userId"));
    let {id, content, createdAt, user} = data;
    $(`#comment-list-${idx}`).append(`
    <li href="#" class="list-group-item list-group-item-action">
    <div class="d-flex w-100 justify-content-between">
        <small class="mb-1"><small class="mb-1 tit">${user.name}</small>
        ${moment(createdAt).fromNow()}</small>
        ${userId === user.id
        ? `<button type="button" class="btn-close small" aria-label="remove" onclick="app.removeComment(${idx}, ${id})"></button>`
        : `<button onclick="app.letsMeet(${idx}, ${user.id})" class="badge bg-success rounded-pill">chat</button>`}
  </div>
  <p class="mb-1">${content}</small>
</li>`);
}

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
    let path = location.hash.replace("#", "")
    connect();
    switch (path) {
        case "":
            homePage();
            getArticles();
            setModal();
            setTimeout(() => showWriteButton(), 1000);
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
    if (path.startsWith("chat")) {
        chatView();
    }
}

window.addEventListener('hashchange', router)

router();
export {getArticles, setModal, registerView, logInView, chatView, addComment, callComments};
