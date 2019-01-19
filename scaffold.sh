#!/bin/bash
set -Ceuo pipefail

function usage() {
    local me=$(basename $0)
    cat << EOF

    ${me} [-h|--help]

    ブログ記事の雛形生成スクリプト
    対話シェルに沿って必要事項を入力し、mdテンプレートを作成する
EOF
}

# ===================================================
# variable
# ===================================================
fileName=""
postTitle=""
isBookPost=false

COLOR_ESC="\e["
COLOR_ESC_END="m"
COLOR_RED=${COLOR_ESC}31${COLOR_ESC_END}
COLOR_YELLO=${COLOR_ESC}33${COLOR_ESC_END}
COLOR_BLUE=${COLOR_ESC}34${COLOR_ESC_END}
COLOR_OFF=${COLOR_ESC}${COLOR_ESC_END}
# ===================================================
# function
# ===================================================
function printError() {
    printf "${COLOR_RED}Error${COLOR_OFF} $1\n\n"
}
function printSuccess() {
    printf "${COLOR_BLUE}Success${COLOR_OFF} $1\n\n"
}
function printInfo() {
    printf "${COLOR_YELLO}Info${COLOR_OFF} $1\n"
}

function setIsBookPost() {
    read -p "書籍レビュー記事?(y/n) : " input

    if [[ $input =~ ^y|Y ]] ; then
        printInfo "書籍レビュー"
        isBookPost=true
    fi    
}

function setFilename() {
    read -p "ファイル名 : " input

    if [ -z $input ] ; then
        printError "ファイル名は必須です"
        setFilename
    elif [[ $input =~ ^[a-zA-Z0-9_-]*$ ]] ; then
        fileName=$input
    else
        printError "ファイル名は半角英数字と_-で指定してください"
        setFilename
    fi
}

function setTitle() {
    read -p "記事のタイトル : " input
    postTitle=$input
}

function createFile() {
    local subDir=$(date '+%Y/%m/%d')
    local dir="entries/$subDir"
    local file="$dir/$fileName.md"

    if [ -e $file ]; then
        printError "すでにファイルが存在しています"
        exit 1
    fi
    if [ ! -e $dir ]; then
        mkdir -p $dir
    fi

    if $isBookPost; then
    # 書籍記事
    tee $file <<EOF
---
type: 'book'
path: '/blog/$subDir/$fileName'
date: '$(date '+%Y-%m-%d')'
title: '[読書記録]$postTitle'
amazonAff: ''
keyword: ''
---

EOF
    else
    # 一般ブログ記事
    tee $file <<EOF
---
type: 'blog'
path: '/blog/$subDir/$fileName'
date: '$(date '+%Y-%m-%d')'
title: '$postTitle'
keyword: ''
---

EOF
    fi

    printSuccess "Create $file"
}

function main() {
    setIsBookPost
    setFilename
    setTitle
    createFile
}

# ===================================================
# main
# ===================================================
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if (($# > 0)); then
    case "$1" in
    --help | -h)
        usage $@
        exit 0
        ;;
    esac

    shift
fi
main