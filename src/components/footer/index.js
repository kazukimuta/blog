import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGithubSquare } from '@fortawesome/free-brands-svg-icons'

import './footer.css'
import Config from '../../config/config'

const Footer = () => {
  return (
    <footer className="footer">
      <p className="wrap-icon">
        <a href={Config.githubPage} rel="nofollow noopener" target="_blank">
          <FontAwesomeIcon
            color="#333"
            size="2x"
            icon={faGithubSquare}
            className="icon"
          />
        </a>
      </p>
      <p className="author">authored by {Config.blogAuthor}</p>
    </footer>
  )
}

export default Footer
