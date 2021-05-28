import React from 'react'
import PropTypes from 'prop-types'
import { StaticQuery, graphql } from 'gatsby'

import RootHeader from '../header/rootHeader'
import PageHeader from '../header/pageHeader'
import AboutHeader from '../header/aboutHeader'
import Footer from '../footer/index'
import '../../style/global.css'

const Layout = ({ frontmatter, isRoot, children }) => {
  let docHeader = ''
  if (isRoot) {
    docHeader = ''
  } else if (frontmatter.type === 'page') {
    docHeader = <AboutHeader frontmatter={frontmatter} />
  } else {
    docHeader = <PageHeader frontmatter={frontmatter} />
  }
  return (
    <StaticQuery
      query={graphql`
        query SiteTitleQuery {
          site {
            siteMetadata {
              title
            }
          }
        }
      `}
      render={(data) => (
        <>
          <RootHeader>{docHeader}</RootHeader>
          <main>
            <div className="container">
              {children}
              <Footer />
            </div>
          </main>
        </>
      )}
    />
  )
}

Layout.propTypes = {
  children: PropTypes.node.isRequired,
  frontmatter: PropTypes.object,
  isRoot: PropTypes.bool,
}

Layout.defaultProps = {
  isRoot: false,
}

export default Layout
