//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";

contract SwapRouter {
    address public dai;
    address public weth;

    ISwapRouter public swapRouter;
    uint24 public constant swapFee = 3000;

    event WethToDaiCompleted(address indexed spender, uint256 amountIn, uint256 amountOut);

    constructor(address _dai, address _weth, ISwapRouter _swapRouter) {
        dai = _dai;
        weth = _weth;
        swapRouter = _swapRouter;
    }

    function swapWETHForDai(uint256 amountIn) external returns (uint256 amountOut) {
        // Transfer WETH to contract
        TransferHelper.safeTransferFrom(weth, msg.sender, address(this), amountIn);

        // Approve contract to swap
        TransferHelper.safeApprove(weth, address(swapRouter), amountIn);

        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: weth,
            tokenOut: dai,
            fee: swapFee,
            recipient: msg.sender,
            deadline: block.timestamp,
            amountIn: amountIn,
            amountOutMinimum: 0x0,
            sqrtPriceLimitX96: 0
        });

        // The call to `exactInputSingle` executes the swap.
        amountOut = swapRouter.exactInputSingle(params);
        emit WethToDaiCompleted(msg.sender, amountIn, amountOut);
        return amountOut;
    }
}
