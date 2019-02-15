import React, { Component } from 'react'
import PropTypes from 'prop-types'
// Worker function
import { isMobile } from './is-mobile'
// CSS
import classes from './Tooltip.css'
// JSX
import QuestionMark from './SVG/question-mark'
import Content from './Content/Content'

export default class Tooltip extends Component {
  static propTypes = {
    // Tooltip propTypes (style and JSX element replacement)
    tooltip: PropTypes.element,
    fill: PropTypes.string,
    background: PropTypes.string,
    className: PropTypes.string,
    // Tooltip functionality
    shouldDisableHover: PropTypes.bool,
    shouldDisableClick: PropTypes.bool,
    children: PropTypes.any
  }

  constructor(props) {
    super(props)
    // Boolean, true if on a mobile device.
    this.isMobile = isMobile()
    // References, cries in React Hooks.
    this.myTooltip = React.createRef()
    this.myWrapper = React.createRef()
    this.myContent = React.createRef()
    this.myTriangle = React.createRef()
    // Hover timeout to unmount tooltip.
    this.onMouseLeaveTimeout = null
  }

  state = { // Initial state
    bIsHidden: true,
    bIsNotHovered: true
  }

  /**
   * Calculates in which quarter of the screen the element is at.
   */
  calculateQuarter = (rect, viewportX, viewportY) => {
    const response = []
    if (rect.top >= viewportY / 2) {
      response.push('bottom')
    } else {
      response.push('top')
    }
    if (rect.left >= viewportX / 2) {
      response.push('right')
    } else {
      response.push('left')
    }
    return response.join('_')
  }

  /**
   * Depending of which quarter of the screen the element is at (calculated in calculateQuarter), then
   * assings CSS style properties to the tooltip container (and triangle) respective to the quarter
   * to ensure the tooltip will be completely shown in the screen.
   */
  smartPositioning = (quarter) => {
    switch (quarter) {
      case QUARTERS.TOP_LEFT:
        // Container position
        this.myContent.current.style.top = [36, 'px'].join('')
        this.myContent.current.style.left = [-18, 'px'].join('')
        // Triangle position
        this.myTriangle.current.style.top = [13, 'px'].join('')
        break
      case QUARTERS.TOP_RIGHT:
        // Container position
        this.myContent.current.style.top = [36, 'px'].join('')
        this.myContent.current.style.right = [-18, 'px'].join('')
        // Triangle position
        this.myTriangle.current.style.top = [13, 'px'].join('')
        break
      case QUARTERS.BOTTOM_LEFT:
        // Container position
        this.myContent.current.style.bottom = [24, 'px'].join('')
        this.myContent.current.style.left = [-18, 'px'].join('')
        // Triangle position
        this.myTriangle.current.style.bottom = [1, 'px'].join('')
        this.myTriangle.current.style.transform = 'none'
        break
      case QUARTERS.BOTTOM_RIGHT:
        // Container position
        this.myContent.current.style.bottom = [24, 'px'].join('')
        this.myContent.current.style.right = [-18, 'px'].join('')
        // Triangle position
        this.myTriangle.current.style.bottom = [1, 'px'].join('')
        this.myTriangle.current.style.transform = 'none'
        break
      default:
        // Copying QUARTERS.BOTTOM_LEFT settings for the default case.
        // Container position
        this.myContent.current.style.bottom = [24, 'px'].join('')
        this.myContent.current.style.left = [-18, 'px'].join('')
        // Triangle position
        this.myTriangle.current.style.bottom = [1, 'px'].join('')
        this.myTriangle.current.style.transform = 'none'
    }
  }

  /**
   * watchOverflow will determine if the element is overflown (outside of viewport).
   * If it's overflown, then transform the element to the left so that it'll be inside the viewport,
   * and the tooltip will be legible.
   */
  watchOverflow = (rect) => {
    if (!rect) { return } // Avoid crashes
    const viewportX = Math.max(document.documentElement.clientWidth || 0)
    const contentRect = this.myContent.current.getBoundingClientRect()
    if ((contentRect.width + contentRect.left) >= viewportX) { // Right Side
      this.myContent.current.style.transform = `translateX(-${contentRect.right - contentRect.width - 12}px)`
    } else if (contentRect.left < 0) { // Left Side
      this.myContent.current.style.transform = `translateX(${Math.abs(contentRect.left) + 12}px)`
    }
  }

  /**
   * Determines the positioning of the Tooltips based on the position inside the viewport WHEN OPENED,
   * and watches if it's overflowing the viewport. If it's overflowing, then it will translate the tooltip
   * to the left.
   */
  calculatePosition = () => {
    if (!this.myContent.current && !this.myTriangle.current) { return } // Avoid crashes
    const viewportX = Math.max(document.documentElement.clientWidth || 0)
    const viewportY = Math.max(document.documentElement.clientHeight || 0)
    const rect = this.myContent.current.getBoundingClientRect()
    const quarter = this.calculateQuarter(rect, viewportX, viewportY)
    this.smartPositioning(quarter)
    this.watchOverflow(rect)
    /**
     * Finally although not having to do anything with positioning, we set the triangle SVG fill EQUAL
     * to the background color of the content window of the tooltip.
     */
    const contentBackgroundColor = window.getComputedStyle(this.myContent.current).backgroundColor
    this.myTriangle.current.style.fill = contentBackgroundColor
  }

  /**
   * When on mobile, if an orientation change event happens, close the modal to avoid bugs.
   */
  componentDidMount() {
    window.addEventListener('resize', this.closeTooltip)
    if (this.isMobile) {
      window.addEventListener('orientationchange', this.closeTooltip)
    }
  }

  /**
   * Adds or removes event listeners, depending if on a mobile or on a desktop.
   */
  eventListenersHandler = (handler) => {
    switch (handler) {
      case 'ADD':
        if (this.isMobile) {
          document.addEventListener('touchend', this.outsideClickListener)
        } else if (!this.isMobile) {
          document.addEventListener('click', this.outsideClickListener)
          document.addEventListener('keydown', this.escFunction, false)
        }
        break
      case 'REMOVE':
        if (this.isMobile) {
          document.removeEventListener('touchend', this.outsideClickListener)
        } else if (!this.isMobile) {
          document.removeEventListener('click', this.outsideClickListener)
          document.removeEventListener('keydown', this.escFunction, false)
        }
        break
      default:
        // do nothing
    }
  }

  componentDidUpdate(_, prevState) {
    /**
     * The tooltip should only recalculate if the tooltip was hidden in the previous state, meaning
     * it will only recalculate only if it's re-mounting. bIsHidden is given priority in case the
     * user clicked the tooltip.
     */
    let bWasShown = false
    if (!prevState.bIsNotHovered) {
      bWasShown = true
    } else if (!prevState.bIsHidden) {
      bWasShown = true
    }
    if (bWasShown) { return }
    /**
     * If the tooltip is active, then calculate then:
     * 1. Calculate then .focus() the wrapper element to open the tooltip.
     * 2. Calculate the position (position: absolute coordinates).
     * 3. Applies or removes event listeners that manage the tooltip.
     */
    if (!this.state.bIsHidden || !this.state.bIsNotHovered) {
      if (!this.myWrapper.current) { return } // Protection
      this.myWrapper.current.focus()
      this.calculatePosition()
      this.eventListenersHandler('ADD')
    // Removes the event listener if the tooltip is being hidden.
    } else {
      this.eventListenersHandler('REMOVE')
    }
  }

  componentWillUnmount() {
    // Remove any event listener that might be active.
    if (this.isMobile) {
      window.removeEventListener('orientationchange', this.closeTooltip)
    }
    window.removeEventListener('resize', this.closeTooltip)
    // Document event listeners.
    this.eventListenersHandler('REMOVE')
    // Clearing timeout on mouse leave event.
    clearTimeout(this.onMouseLeaveTimeout)
  }

  /**
   * If the user is hovering the tooltip then open it, otherwise close it UNLESS the user clicked on the tooltip.
   */
  onHoverHandler = (handler, event) => {
    // Disabled on mobile devices (no hover) or if the shouldDisableHover prop is true.
    if (this.isMobile || this.props.shouldDisableHover) { return }
    if (!handler) {
      // Clearing timeout on mouse leave event.
      clearTimeout(this.onMouseLeaveTimeout)
      this.onMouseLeaveTimeout = null
      this.setState({
        bIsNotHovered: handler
      })
    } else {
      /**
       * Event persist is called to avoid receiving null events if the component dismounts.
       * We declare X and Y positions to know where is the mouse pointer hovering. The result of this
       * boolean will be stored in bIsHoveringTooltip. Next, this.onMouseLeaveTimeout will fire within
       * 100ms, these 100ms will let the user have some time to hover the tooltip. IF the user hovers
       * over the tooltip bIsHoveringTooltip will be true and the tooltip won't be dismounted, however
       * if the user pulls the mouse away from the tooltip the tooltip will be dismounted.
       */
      event.persist()
      const x = event.clientX
      const y = event.clientY
      const bIsHoveringTooltip = this.myTooltip.current.contains(document.elementFromPoint(x, y))
      if (!bIsHoveringTooltip) {
        this.onMouseLeaveTimeout = setTimeout(() => {
          this.setState({
            bIsNotHovered: handler
          })
        }, 100)
      }
    }
  }

  toggleTooltip = () => {
    // Disabled if the shouldDisableHover prop is true.
    if (this.props.shouldDisableClick) { return }
    this.setState(prevState => {
      return {
        bIsHidden: !prevState.bIsHidden
      }
    })
  }

  closeTooltip = () => {
    // Disabled if the shouldDisableHover prop is true.
    if (this.props.shouldDisableClick) { return }
    this.setState({
      bIsHidden: true,
      bIsNotHovered: true
    })
  }

  /**
   * Closes the tooltip as long as the click was made outside of the tooltip wrapper.
   * The wrapper contains:
   * 1. The tooltip button.
   * 2. The tooltip window.
   */
  outsideClickListener = event => {
    const element = this.myTooltip.current
    if (!element.contains(event.target) && isVisible(element)) {
      this.closeTooltip()
    }
  }

  // Close the tooltip when the ESC is pressed.
  escFunction = (e) => {
    if (e.keyCode === 27) {
      this.closeTooltip()
    }
  }

  /**
   * Optimization, only update virtual DOM if there is a change in bIsHidden or bIsNotHovered.
   */
  shouldComponentUpdate(_, nextState) {
    return this.state.bIsHidden !== nextState.bIsHidden || this.state.bIsNotHovered !== nextState.bIsNotHovered
  }

  render() {
    /**
     * The tooltip content will render if bIsHidden if false or if the tooltip is not hovered.
     * This means that bIsHidden being true will have priority, which means if the user clicks the tooltip,
     * then it won't be unmounted when unhovering the tooltip.
     */
    let shouldRender = false
    if (!this.state.bIsHidden) {
      shouldRender = true
    } else if (!this.state.bIsNotHovered) {
      shouldRender = true
    }
    return (
      <div ref={this.myTooltip}
        className={this.props.tooltip ? null : classes.Container}
        // On mouse hover handlers.
        onMouseOver={() => this.onHoverHandler(false)}
        onMouseLeave={(event) => this.onHoverHandler(true, event)}>
        <i
          /**
          * onMouseDown event fires before onBlur event on input. It calls event.preventDefault() to
          * prevent onBlur from being called, and doesn't prevent the navLink click from happening,
          * this guarantees that the NavLink will redirect on click without having to use SetTimeout
          * or any other hack.
          */
          onMouseDown={event => event.preventDefault()}
          onClick={this.toggleTooltip} >
          {this.props.tooltip ? this.props.tooltip
            : (
              <QuestionMark fill={this.props.fill} background={this.props.background} />
            )}
        </i>
        {shouldRender ? (
          <Content
            className={this.props.className}
            reference={this.myWrapper}
            contentReference={this.myContent}
            triangleReference={this.myTriangle}
            closeTooltip={this.closeTooltip} >
            {this.props.children}
          </Content>)
          : null}
      </div>
    )
  }
}

/**
 * If an element is visible.
 */
const isVisible = elem => !!elem && !!(elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length)

const QUARTERS = {
  TOP_LEFT: 'top_left',
  TOP_RIGHT: 'top_right',
  BOTTOM_LEFT: 'bottom_left',
  BOTTOM_RIGHT: 'bottom_right'
}