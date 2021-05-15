import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTwitter, faGithubSquare } from '@fortawesome/free-brands-svg-icons'
import config from '../../config/config'

const Header = ({children}) => (
  <div>
    <nav className="navbar">
      <div className="container">
        <div className="grid">
          <div>
            <a className="brand" href="/">{config.blogTitle}</a>
          </div>
          <div className="menu-item flex">
            <a href="/blog">Blog</a>
            <a href="/me">About</a>
            <a href="/me">Contact</a>
            <a href="/me">
              <FontAwesomeIcon
                color="#333"
                size="1x"
                icon={faTwitter}
                className="icon"
              />
            </a>
            <a>
              <FontAwesomeIcon
                color="#333"
                size="1x"
                icon={faGithubSquare}
                className="icon"
              />
            </a>
          </div>
        </div>
      </div>
    </nav>
    {children}
  </div>
)

export default Header
