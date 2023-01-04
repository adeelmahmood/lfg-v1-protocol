//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";

contract SwapRouter {
    ISwapRouter public swapRouter;
    uint24 public constant swapFee = 3000;

    event TokenSwapCompleted(
        address indexed spender,
        address fromToken,
        address toToken,
        uint256 amountIn,
        uint256 amountOut
    );

    constructor(ISwapRouter _swapRouter) {
        swapRouter = _swapRouter;
    }

    function swap(
        address _fromToken,
        address _toToken,
        uint256 amountIn
    ) external returns (uint256 amountOut) {
        // Transfer fromToken to contract
        TransferHelper.safeTransferFrom(_fromToken, msg.sender, address(this), amountIn);

        // Approve contract to swap
        TransferHelper.safeApprove(_fromToken, address(swapRouter), amountIn);

        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: _fromToken,
            tokenOut: _toToken,
            fee: swapFee,
            recipient: msg.sender,
            deadline: block.timestamp,
            amountIn: amountIn,
            amountOutMinimum: 0x0,
            sqrtPriceLimitX96: 0
        });

        // The call to `exactInputSingle` executes the swap.
        amountOut = swapRouter.exactInputSingle(params);
        emit TokenSwapCompleted(msg.sender, _fromToken, _toToken, amountIn, amountOut);
        return amountOut;
    }
}
