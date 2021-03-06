import $ from "jquery"

// 자동으로 전화번호 형태 만들기
export const autoHyphen = () => {
    let target = event.target
    target.value = target.value
        .replace(/[^0-9]/, '')
        .replace(/^(\d{2,3})(\d{3,4})(\d{4})$/, `$1-$2-$3`)
}

// 비밀 번호 유효성 검사
export const passwordOK = () => {
    const password = $("#exampleInputPassword1").val()
    const rePassword = $("#exampleInputPassword2").val()
    const regex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/
    if (!regex.test(password)) {
        $("#pwdHelp").text("비밀번호 양식이 올바르지 않습니다. (영문,소문자 8자 이상)")
        $("#submit-register").attr("disabled", true)
    } else if (rePassword && (password !== rePassword)) {
        $("#re-password-help").text("비밀번호와 확인이 일치하지 않습니다.")
        $("#submit-register").attr("disabled", true)
    } else {
        $("#pwdHelp").text("")
        $("#re-password-help").text("")
        $("#submit-register").removeAttr("disabled")
    }
}

export const senseEnter = (func) => {
    if (event.which === 13) {
        func()
    }
}

// 이메일 유효성 검사
export const checkEmail = () => {
    const email = $("#exampleInputEmail1").val()
    const regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    if (!regex.test(email)) {
        $("#emailHelp").text("이메일 형식이 올바르지 않습니다.")
        $("#submit-register").attr("disabled", true)
    } else {
        $("#emailHelp").text("")
    }
}

