import $ from 'jquery'
import axios from "axios"
import moment from "moment"
import {
    userId,
    removeComment,
    letsChitChat,
    sendMessage,
    loginWithKakao,
    loginToAuth,
    signupToAuth,
    writeArticle,
    toggleComment,
    writeComment,
    editArticle,
    deleteArticle,
    nickNameOK
} from './index'
import {autoHyphen, checkEmail, passwordOK, senseEnter,} from './utils'

// 로그인한 사용자인지 판별 후 리퀘스트헤더+내비바 셋팅
export function setHeader() {
    let token = sessionStorage.getItem("token")
    if (!token) {
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

// 글쓰기 버튼(fixed) 호출
export const showWriteButton = () => {
    let token = sessionStorage.getItem("token")
    if (!token) {
        alert("로그인 후에 이용할 수 있습니다.")
        location.hash = "login"
    }
    $("#articles-body").append(`
    <button class="btn btn-success"
        data-bs-target="#staticBackdrop"
        data-bs-toggle="modal" id="backDrop"
        type="button">write a post
    </button>`)
}

// 댓글 생성
export function addComment(idx, data) {
    let {content, createdAt, user} = data
    $(`#comment-list-${idx}`).append(`
    <li href="#" class="list-group-item list-group-item-action">
        <div class="d-flex w-100 justify-content-between">
            <small class="mb-1"><small class="mb-1 tit">${user.name}</small>
            ${moment(createdAt).fromNow()}</small>
            ${userId === user.id
        ? `<button id="removeComment-${data.id}" type="button" class="btn-close small" aria-label="remove"></button>`
        : `<button id="letsMeet-${data.id}" class="badge bg-success rounded-pill">chat</button>`}
      </div>
      <p class="mb-1">${content}</small>
    </li>`)
    $(document).on("click", `#removeComment-${data.id}`, () => removeComment(idx, data.id))
    $(document).on("click", `#letsMeet-${data.id}`, () => {
        console.log(idx, user.id, userId)
        letsChitChat(idx, user.id, userId)
    })
}

// 홈 셋팅
export const homePage = () => {
    let div = document.createElement("div")
    div.className = "card-deck"
    div.id = "articles-body"
    $("main > div").replaceWith(div)
}

// 채팅 화면
export function chatView() {
    $("main").html(`
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
                    <input class="message_input" placeholder="Type your message here..."/>
                </div>
                <div class="send_message">
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
        </div>`)
    $(document).on("click", ".send_message", () => sendMessage())
    $(document).on("keyup", ".message_input", () => senseEnter(sendMessage))
}

// 로그인 화면
export function logInView() {
    $("main").html(`
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
                     placeholder="Password" type="password">
                <small class="form-text text-muted" id="pwdHelp"></small>
            </div>
            <button class="btn mt-3 btn-lg login btn-login" id="submit-login" type="button">Login
            </button>
            <button class="btn mt-3 btn-lg login btn-kakao" id="custom-login-btn">Kakao Login</button>
        </form>
        <a class="text-success" href="#signup">let me signup</a>
    </div>`)

    $(document).on("click", "#custom-login-btn", () => loginWithKakao())
    $(document).on("click", "#submit-login", () => loginToAuth())
    $(document).on("input", "#exampleInputPassword1", () => passwordOK())
}

// 회원가입 화면
export function registerView() {
    $("main").html(`
    <div class="col-lg-3 col-sm-4 m-auto">
         <form action="" style="display: grid;">
             <div class="form-group">
                 <label class="form-label mt-4" for="exampleInputEmail1">Email address</label>
                 <input aria-describedby="emailHelp" class="form-control" id="exampleInputEmail1" 
                     placeholder="enter email" type="email">
                 <small class="form-text text-muted" id="emailHelp"></small>
             </div>
             <div class="form-group">
                 <label class="col-form-label-sm mt-2" for="inputDefault">Name</label>
                 <div class="input-group">
                     <input aria-describedby="nameCheck" class="form-control" id="inputDefault" type="text" aria-label="tell us your name" placeholder="tell us your name">
                     <button class="btn btn-primary" type="button" id="nameCheck">check</button>
                 </div>
                 <small class="form-text text-muted" id="nameHelp"></small>
             </div>
             <div class="form-group">
                 <label class="col-form-label-sm mt-2" for="phoneDefault">Phone</label>
                 <input aria-describedby="phoneHelp" class="form-control" id="phoneDefault" 
                     pattern="[0-9]{3}-[0-9]{2}-[0-9]{3}" placeholder="insert your phone number" type="tel">
                 <small class="form-text text-muted" id="phoneHelp"></small>
             </div>
             <div class="form-group">
                 <label class="form-label mt-2" for="exampleInputPassword1">Password</label>
                 <input aria-describedby="pwdHelp" class="form-control" id="exampleInputPassword1" 
                     placeholder="password" type="password">
                 <small class="form-text text-muted" id="pwdHelp"></small>
             </div>
             <div class="form-group">
                 <label class="form-label-sm mt-2" for="exampleInputPassword2">re-Password</label>
                 <input aria-describedby="re-password-help" class="form-control" id="exampleInputPassword2"
                     placeholder="confirm password" type="password">
                 <small class="form-text text-muted" id="re-password-help"></small>
             </div>
             <button class="btn mt-3 btn-lg btn-success" disabled id="submit-register" type="button">Register
             </button>
         </form>
         <a class="text-success" href="#login">let me signin</a></div>`)
    $(document).on("input", "#exampleInputEmail1", () => checkEmail())
    $(document).on("input", "#phoneDefault", () => autoHyphen())
    $(document).on("input", "#exampleInputPassword1", () => passwordOK())
    $(document).on("click", "#nameCheck", () => nickNameOK())
    $(document).on("click", "#submit-register", () => signupToAuth())
}

// 게시글 작성 모달 셋팅
export function setModal() {
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
                        <button class="btn btn-primary" id="modal-write-button" type="button">Write</button>
                    </div>
                </form>
            </div>
        </div>
    </div>`)
    setTimeout(() => showWriteButton(), 1000)
    $(document).on("click", "#modal-write-button", () => writeArticle())
}


export const drawArticle = (article) => {
    const {title, content, user, imagePath, imageName} = article
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
            <button id="toggleComment-${article.id}" title="comment" type="button" class="btn btn-success">
            <i class="fas fa-comments"></i></button>
            {{__is_this_yours?__}}
            </div>
            <div id="commentEdit-${article.id}" class="input-group m-3 form-floating">
                <input id="commentWrite-${article.id}" class="form-control" aria-describedby="button-addon2-${article.id}">
                <label for="floatingInput">Leave a Comment...</label>
                <button class="btn btn-success" id="button-addon2-${article.id}">Button</button>
            </div>
            <ul class="list-group" id="comment-list-${article.id}">
            </ul></div></div>`
    const no_not_mine = ""
    const my_contents = `
        <button id="editArticle-${article.id}" title="edit" type="button" class="btn btn-success">
        <i class="far fa-edit"></i></button>
        <button id="deleteArticle-${article.id}" title="delete" type="button" class="btn btn-success">
        <i class="fas fa-trash-alt"></i></button>`
    if (user.id === userId) {
        $("#articles-body").append(temp_html.replace("{{__is_this_yours?__}}", my_contents))
    } else {
        $("#articles-body").append(temp_html.replace("{{__is_this_yours?__}}", no_not_mine))
    }
    $(document).on("click", `#toggleComment-${article.id}`, () => toggleComment(article.id))
    $(document).on("click", `#button-addon2-${article.id}`, () => writeComment(article.id))
    $(document).on("click", `#editArticle-${article.id}`, () => editArticle(article.id))
    $(document).on("click", `#deleteArticle-${article.id}`, () => deleteArticle(article.id))
}